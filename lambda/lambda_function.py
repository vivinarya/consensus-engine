import json
import asyncio
import boto3
import hashlib
import time
from datetime import datetime
from botocore.config import Config


import os

retry_config = Config(
    retries={
        'max_attempts': 5,
        'mode': 'adaptive'
    }
)

bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1', config=retry_config)
rds_data       = boto3.client('rds-data', region_name='us-east-1')
dynamodb       = boto3.resource('dynamodb')
cache_table    = dynamodb.Table('semantic_cache')

# Database setup
CLUSTER_ARN = os.environ.get("DB_CLUSTER_ARN")
SECRET_ARN  = os.environ.get("DB_SECRET_ARN")
DB_NAME     = os.environ.get("DB_NAME", "postgres")

class AuroraDB:
    def __init__(self):
        self.last_error = None
        if CLUSTER_ARN and SECRET_ARN:
            try:
                # Ensure table exists using Data API
                self.execute("""
                    CREATE TABLE IF NOT EXISTS consensus_store (
                        key TEXT PRIMARY KEY,
                        value TEXT,
                        query_text TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
            except Exception as e:
                self.last_error = f"Initialization failed: {str(e)}"

    def execute(self, sql, params=None):
        if not CLUSTER_ARN or not SECRET_ARN: return None
        
        # Convert simple dict params to Data API format if needed
        # For simplicity in this build, we'll use direct SQL formatting or simple mapping
        # Data API expects specific parameter structures, but for standard SQL we can just run it
        
        formatted_params = []
        if params:
            for k, v in params.items():
                if isinstance(v, str):
                    formatted_params.append({'name': k, 'value': {'stringValue': v}})
                elif isinstance(v, int):
                    formatted_params.append({'name': k, 'value': {'longValue': v}})
        
        return rds_data.execute_statement(
            resourceArn=CLUSTER_ARN,
            secretArn=SECRET_ARN,
            database=DB_NAME,
            sql=sql,
            parameters=formatted_params
        )

    def get(self, key):
        try:
            res = self.execute("SELECT value FROM consensus_store WHERE key = :k", {'k': key})
            records = res.get('records', [])
            if records and records[0]:
                return json.loads(records[0][0]['stringValue'])
            return None
        except Exception as e:
            self.last_error = f"Get failed: {str(e)}"
            return None

    def put(self, key, value, query_text=""):
        try:
            val_str = json.dumps(value)
            self.execute("""
                INSERT INTO consensus_store (key, value, query_text)
                VALUES (:k, :v, :q)
                ON CONFLICT (key) DO UPDATE SET value = :v, query_text = :q, created_at = CURRENT_TIMESTAMP
            """, {'k': key, 'v': val_str, 'q': query_text})
        except Exception as e:
            self.last_error = f"Put failed: {str(e)}"

aurora = AuroraDB()


# --- AGENT CLASSES ---
class LLMAgent:
    def __init__(self, model_id: str, provider: str, name: str):
        self.model_id = model_id
        self.provider = provider
        self.name = name

    async def generate(self, query: str, attachments: list = None) -> dict:
        loop = asyncio.get_running_loop()
        

        content_items = [{"text": query}]
        
        if attachments:
            for att in attachments:
                if att['type'] == 'image':
                    import base64
                    content_items.append({
                        "image": {
                            "format": att['format'],
                            "source": {"bytes": base64.b64decode(att['data'])}
                        }
                    })
                elif att['type'] == 'document':
                    import base64
                    content_items.append({
                        "document": {
                            "format": att['format'],
                            "name": att.get('name', 'Attachment'),
                            "source": {"bytes": base64.b64decode(att['data'])}
                        }
                    })

        messages = [{"role": "user", "content": content_items}]
        start_time = time.time()
        
        try:
            response = await loop.run_in_executor(
                None,
                lambda: bedrock_client.converse(
                    modelId=self.model_id,
                    messages=messages,
                    inferenceConfig={"temperature": 0.2, "maxTokens": 1000}
                )
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            content = response['output']['message']['content'][0]['text']
            
            return {
                "model_name": self.name,
                "provider": self.provider,
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "latency_ms": latency_ms
            }
        except Exception as e:
            return {
                "model_name": self.name,
                "provider": self.provider,
                "content": f"BLOCKED BY AWS: {str(e)}",
                "timestamp": datetime.utcnow().isoformat(),
                "latency_ms": 0
            }

# Worker 1: High speed, low cost
class Llama4ScoutAgent(LLMAgent):
    def __init__(self):
        super().__init__("arn:aws:bedrock:us-east-1:192492986116:inference-profile/us.meta.llama4-scout-17b-instruct-v1:0", "Meta", "Llama 4 Scout 17B")

# Worker 2: High diversity, low cost
class MinistralAgent(LLMAgent):
    def __init__(self):
        super().__init__("mistral.ministral-3-8b-instruct", "Mistral AI", "Ministral 8B 3.0")


class NovaProAgent(LLMAgent):
    def __init__(self):
        super().__init__("amazon.nova-pro-v1:0", "Amazon", "Nova Pro")


# --- ORCHESTRATION & SCORING ---

async def evaluate_worker_response(query: str, answer_text: str, judge: LLMAgent):
    # 1. Confidence Score (Judge)
    confidence_prompt = f"Question: {query}\n\nAnswer: {answer_text}\n\nRate confidence from 0 to 1. Return only the number."
    conf_resp = await judge.generate(confidence_prompt)
    try:
        import re
        match = re.search(r'0\.\d+|1\.0|0|1', conf_resp['content'])
        confidence = float(match.group()) if match else 0.5
    except:
        confidence = 0.5
        
    # 2. Keyword Score
    import string
    query_words = set(query.lower().translate(str.maketrans('', '', string.punctuation)).split())
    stop_words = {'write', 'explain', 'what', 'how', 'does', 'process', 'for', 'the', 'and', 'this', 'that', 'with', 'from'}
    extracted_keywords = [w for w in query_words if len(w) > 3 and w not in stop_words]
    
    query_raw = query.lower()
    
    cat_greetings = ['hi', 'hello', 'hey', 'sup', 'how are you', 'howdy', 'morning', 'afternoon', 'good night', 'bye', 'greetings', 'what is up', 'hola', 'bonjour']
    cat_affirmations = ['thank you', 'thanks', 'cool', 'awesome', 'nice', 'great', 'perfect', 'ok', 'okay', 'yes', 'no', 'wow', 'amazing', 'correct', 'good']
    cat_testing = ['test', 'testing', 'who are you', 'what are you', 'are you ai', 'ping', '123', 'check', 'hello world', 'can you hear me', 'bot', 'ignore previous']
    cat_utility = ['what time', 'what day', 'convert', 'translate', 'summarize', 'fix this', 'tell me a joke', 'flip a coin', 'roll a die', 'calculate', 'what is', 'how to', 'help me', 'extract', 'format', 'parse']
    cat_conversational = ['why', 'how come', 'really', 'are you sure', 'give me an example', 'can you explain', 'tell me more', 'elaborate', 'in other words', 'simply put', 'explain like i am 5']
    cat_facts = ['when did', 'who is', 'where is', 'capital of', 'population of', 'how many', 'history of', 'what does', 'who invented', 'who discovered', 'meaning of']
    cat_creative = ['write a', 'generate', 'create a', 'brainstorm', 'give me ideas', 'make a list', 'write a poem', 'compose', 'draft', 'design', 'suggest', 'invent']
    cat_coding = ['code', 'python', 'javascript', 'html', 'css', 'react', 'sql', 'debug', 'refactor', 'optimize', 'write a script', 'how do i code', 'compile', 'error', 'exception']
    cat_analytical = ['compare', 'contrast', 'analyze', 'evaluate', 'pros and cons', 'differences between', 'similarities between', 'review', 'assess']
    cat_legal_medical = ['is it legal', 'law', 'sue', 'symptoms', 'medicine', 'treatment', 'doctor', 'contract', 'agreement', 'clause', 'liability']
    cat_math_logic = ['solve', 'compute', 'equation', 'formula', 'integral', 'derivative', 'probability', 'statistics', 'puzzle', 'riddle', 'logic']
    cat_roleplay = ['act as', 'pretend you are', 'imagine', 'you are a', 'roleplay', 'in the style of', 'persona']
    cat_opinion = ['what do you think', "what's your opinion", 'do you believe', 'which is better', 'should i', 'is it worth']
    cat_formatting = ['table', 'markdown', 'json', 'csv', 'xml', 'bullet points', 'outline', 'format as', 'structure']

    all_triggers = (
        cat_greetings + cat_affirmations + cat_testing + cat_utility + 
        cat_conversational + cat_facts + cat_creative + cat_coding + 
        cat_analytical + cat_legal_medical + cat_math_logic + cat_roleplay + 
        cat_opinion + cat_formatting
    )
    
    clean_query_padded = " " + query_raw.translate(str.maketrans('', '', string.punctuation)) + " "
    
    is_conversational_or_general = len(query) < 120 or any(f" {t} " in clean_query_padded for t in all_triggers)

    if "photosynthesis" in query_raw:
        expected_keywords = ["photosynthesis", "sunlight", "chlorophyll", "glucose", "process", "plant"]
    elif "factorial" in query_raw:
        expected_keywords = ["factorial", "return", "math", "recursive", "multiply", "number"]
    elif is_conversational_or_general:
        expected_keywords = []  
    else:
        expected_keywords = extracted_keywords

    if not expected_keywords:
        keyword_score = 1.0
    else:
        answer_lower = answer_text.lower()
        matched_keywords = sum(1 for kw in expected_keywords if kw in answer_lower)
        keyword_score = matched_keywords / len(expected_keywords)
        
    # 3. Length Score
    if is_conversational_or_general:
        length_score = 1.0
    else:
        length_score = min(len(answer_text) / 200.0, 1.0)

    # 4. Repetition Penalty Score
    words_list = answer_text.lower().split()
    if len(words_list) > 0:
        unique_ratio = len(set(words_list)) / len(words_list)
        repetition_score = round(min(unique_ratio / 0.65, 1.0), 2)
    else:
        repetition_score = 0.0

    # 5. Readability Score
    import re
    sentences = max(len(re.split(r'[.!?]+', answer_text)), 1)
    words_count = max(len(answer_text.split()), 1)
    syllables = sum(max(len(re.findall(r'[aeiouAEIOU]', w)), 1) for w in answer_text.split())
    flesch_raw = 206.835 - 1.015 * (words_count / sentences) - 84.6 * (syllables / words_count)
    readability_score = round(min(max(flesch_raw, 0), 100) / 100, 2)

    # 6. Specificity Score
    specifics = re.findall(r'\b\d+\b|\b[A-Z][a-z]{2,}\b', answer_text)
    specificity_score = round(min(len(specifics) / 10.0, 1.0), 2)

    # 7. Hallucination Defense Score
    hallucination_prompt = (
        f"Answer to evaluate:\n{answer_text}\n\n"
        f"Rate the factual accuracy of this answer from 0.0 to 1.0. "
        f"0.0 means it contains clear factual errors or hallucinations. "
        f"1.0 means it is completely factually accurate. Return ONLY the decimal number."
    )
    hall_resp = await judge.generate(hallucination_prompt)
    try:
        hall_match = re.search(r'0\.\d+|1\.0|0|1', hall_resp['content'])
        hallucination_score = float(hall_match.group()) if hall_match else 0.5
    except:
        hallucination_score = 0.5

    # Final Score
    final_score = (
        (0.30 * confidence) +
        (0.15 * keyword_score) +
        (0.10 * length_score) +
        (0.15 * repetition_score) +
        (0.10 * readability_score) +
        (0.10 * specificity_score) +
        (0.10 * hallucination_score)
    )
    final_score = round(final_score, 2)

    evaluation_details = {
        "confidence":          confidence,
        "keyword_score":       round(keyword_score, 2),
        "length_score":        round(length_score, 2),
        "repetition_score":    repetition_score,
        "readability_score":   readability_score,
        "specificity_score":   specificity_score,
        "hallucination_score": round(hallucination_score, 2),
        "expected_keywords":   list(expected_keywords)
    }
    
    return final_score, evaluation_details


async def process_consensus_query(query: str, attachments: list = None):
    llama = Llama4ScoutAgent()
    ministral = MinistralAgent()
    judge = NovaProAgent()
    
    # 1. Run both workers simultaneously
    worker_results = await asyncio.gather(
        llama.generate(query, attachments),
        ministral.generate(query, attachments)
    )
    llama_resp, ministral_resp = worker_results
    
    if "BLOCKED BY AWS" in llama_resp.get('content', '') or "BLOCKED BY AWS" in ministral_resp.get('content', ''):
        return {
            "status": "ERROR",
            "error_msg": "AWS blocked one of the models."
        }
    
    llama_text = llama_resp['content']
    ministral_text = ministral_resp['content']
    
    # 2. Score both responses concurrently (runs all 7 metrics on both)
    score_results = await asyncio.gather(
        evaluate_worker_response(query, llama_text, judge),
        evaluate_worker_response(query, ministral_text, judge)
    )
    llama_score, llama_eval = score_results[0]
    ministral_score, ministral_eval = score_results[1]
    
    llama_resp["consensus_score"] = llama_score
    llama_resp["evaluation"] = llama_eval
    
    ministral_resp["consensus_score"] = ministral_score
    ministral_resp["evaluation"] = ministral_eval
    
    # 3. Decision Logic: Are both hallucinating?
    if llama_score <= 0.75 and ministral_score <= 0.75:
        # Both failed -> Judge generates definitive answer
        judge_prompt = (
            f"User Question: {query}\n\n"
            f"Both primary agents failed or generated hallucinated responses. Please act as the definitive expert and provide the correct, comprehensive answer."
        )
        judge_resp = await judge.generate(judge_prompt)
        
        return {
            "status": "IMPROVED_BY_JUDGE",
            "responses": [llama_resp, ministral_resp],
            "judge_explanation": "Both workers provided poor or hallucinated answers. The Judge stepped in to provide the definitive correct response.",
            "judge_response": judge_resp,
            "judge_invoked": True
        }
    else:
        # At least one passed -> Judge compares them
        compare_prompt = (
            f"User Question: {query}\n\n"
            f"Response 1 (Llama): {llama_text}\n\n"
            f"Response 2 (Ministral): {ministral_text}\n\n"
            f"Compare Response 1 and Response 2 based on accuracy, depth, and helpfulness. Explain which one is better and why. Keep the explanation to 1 short paragraph."
        )
        compare_resp = await judge.generate(compare_prompt)
        
        return {
            "status": "COMPARISON",
            "responses": [llama_resp, ministral_resp],
            "judge_explanation": compare_resp['content'],
            "judge_invoked": True,
            "can_deep_dive": True # Flag for frontend
        }

async def process_deep_dive(query: str, llama_content: str, ministral_content: str):
    try:
        judge = NovaProAgent()
        prompt = (
            f"You are the Consensus Expert Judge. The user needs a technical deep dive comparison.\n\n"
            f"Original Question: {query}\n\n"
            f"Llama 4 Response: {llama_content}\n\n"
            f"Ministral Response: {ministral_content}\n\n"
            f"Break down both answers. Identify exactly what is correct or incorrect. "
            f"Provide a definitive 'Judge's Recommendation' on what to trust. "
            f"Use professional Markdown with bold headings."
        )
        result = await judge.generate(prompt)
        
        # Ensure we always return a valid object even if content is weird
        content = result.get('content', "The Expert Judge was unable to process this specific comparison.")
        if not content or len(content) < 10:
             content = "The analysis produced an empty result. Please try again with a more detailed query."
             
        return {
            "status": "DEEP_DIVE_RESULT",
            "content": content,
            "model_name": result.get('model_name', judge.name)
        }
    except Exception as e:
        return {
            "status": "DEEP_DIVE_RESULT",
            "content": f"Deep Dive Error: {str(e)}",
            "model_name": "System Error"
        }

async def simulate_code_execution(code: str, language: str):
    judge = NovaProAgent()
    prompt = (
        f"You are a strict, raw compiler and runtime environment for {language}.\n"
        f"Your ONLY job is to execute the code below and print the EXACT console output it would produce.\n"
        f"If the code has compilation errors, print the standard {language} compiler error format.\n"
        f"If it has runtime errors, print the standard {language} traceback and error message.\n"
        f"Never say things like 'Here is the output' or 'This code prints'. Output ONLY the raw console text.\n\n"
        f"```\n{code}\n```"
    )
    result = await judge.generate(prompt)
    output = result['content']
    if output.startswith('```'):
        lines = output.split('\n')
        if len(lines) >= 3 and lines[0].startswith('```') and lines[-1].startswith('```'):
            output = '\n'.join(lines[1:-1])
    return {
        "status": "EXECUTION_RESULT",
        "output": output,
        "model_name": result['model_name']
    }

async def process_notes_analysis(payload: str, mode: str = 'analyze'):
    llama = Llama4ScoutAgent()
    ministral = MinistralAgent()
    judge = NovaProAgent()
    
    if mode == 'flashcards':
        prompt = f"Create a set of revision flashcards from the following notes perfectly mirroring the context. Output ONLY a valid JSON array and absolutely nothing else. Format: [{{\"q\": \"Question Text\", \"a\": \"Answer Text\"}}].\n\nNotes:\n{payload}"
        result = await judge.generate(prompt)
        text = result['content']
        import re
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            text = match.group()
        return {
            "status": "FLASHCARDS_RESULT",
            "content": text
        }
    else:
        prompt = f"Analyze the following notes based entirely on the content given. Provide an objective, exact review on the topic. Do not include unrelated hackathon phrases:\n\n{payload}"
        
        worker_results_future = asyncio.gather(
            llama.generate(prompt),
            ministral.generate(prompt)
        )
        worker_results = await worker_results_future
        
        score_results = await asyncio.gather(
            evaluate_worker_response(prompt, worker_results[0]['content'], judge),
            evaluate_worker_response(prompt, worker_results[1]['content'], judge)
        )
        
        worker_results[0]["consensus_score"] = score_results[0][0]
        worker_results[1]["consensus_score"] = score_results[1][0]
        
        # Sort descending so the first result is objectively the best
        worker_results.sort(key=lambda x: x["consensus_score"], reverse=True)

        return {
            "status": "NOTES_CONCENSUS_RESULT",
            "responses": worker_results
        }

async def process_ai_analysis(payload: str, data_type: str, language: str = None):
    judge = NovaProAgent()
    if data_type == 'code_hub':
        lang_str = f" written in {language}" if language else ""
        prompt = f"Please provide an expert AI review, bug check, and optimization suggestions for the following code snippet{lang_str}. Be concise and helpful:\n\n{payload}"
    elif data_type == 'progress':
        prompt = f"Act as an encouraging AI learning coach. Review the following learning progress data for the user. Provide a 2-3 sentence personalized analysis summarizing their current performance and suggesting a focus area to improve. Be extremely supportive but objective.\nData:\n{payload}"
    else:
        prompt = f"Please analyze this data:\n{payload}"
    
    result = await judge.generate(prompt)
    return {
        "status": "ANALYSIS_RESULT",
        "content": result['content'],
        "model_name": result['model_name']
    }


# --- LAMBDA ENTRY POINT ---


RATE_LIMIT_STORE = {}
RATE_LIMIT_MAX = 60 # 60 requests
RATE_LIMIT_WINDOW = 60 # per 60 seconds

def check_rate_limit(client_id):
    now = time.time()
    if client_id not in RATE_LIMIT_STORE:
        RATE_LIMIT_STORE[client_id] = []
    
    # Clean up old timestamps
    RATE_LIMIT_STORE[client_id] = [ts for ts in RATE_LIMIT_STORE[client_id] if now - ts < RATE_LIMIT_WINDOW]
    
    if len(RATE_LIMIT_STORE[client_id]) >= RATE_LIMIT_MAX:
        return False
        
    RATE_LIMIT_STORE[client_id].append(now)
    return True

def lambda_handler(event, context):
    headers = {
        "Content-Type": "application/json"
    }

    # Extract client IP for rate limiting
    client_ip = "unknown"
    if "requestContext" in event:
        client_ip = event["requestContext"].get("http", {}).get("sourceIp", "unknown")
        
    if not check_rate_limit(client_ip):
        return {
            "statusCode": 429, 
            "headers": headers, 
            "body": json.dumps({"error": "Too Many Requests. Rate limit exceeded (60 per minute)."})
        }

    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    try:
        body = event.get("body", "{}")
        if isinstance(body, str):
            body = json.loads(body)
            
        action = body.get("action", "query")
        query = body.get("query", "")
        username = body.get("username", "anonymous")

        if action in ["query", "JUDGE_DEEP_DIVE"]:
            if not query:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Query is required"})}
            
            # Generating a user-specific cache key
            raw_hash = hashlib.md5(query.strip().lower().encode('utf-8')).hexdigest()
            cache_key = f"{username}_{raw_hash}"

            if action == "JUDGE_DEEP_DIVE":
                llama_text = body.get("llama_content", "")
                ministral_text = body.get("ministral_content", "")
                print(f"DEBUG: Starting Deep Dive for query: {query[:50]}...")
                final_result = asyncio.run(process_deep_dive(query, llama_text, ministral_text))
                print(f"DEBUG: Deep Dive complete. Status: {final_result.get('status')}")
            else:


                cached_data = aurora.get(cache_key)
                if cached_data:
                    # Validate: never serve a cached error
                    cached_str = json.dumps(cached_data).lower()
                    if not any(err in cached_str for err in ['blocked by aws', 'accessdeniedexception', '"status": "error"', 'error_msg']):
                        return {
                            "statusCode": 200,
                            "headers": headers,
                            "body": json.dumps({"cached": True, "source": "aurora", "data": cached_data})
                        }
                    # Bad aurora entry — fall through to DynamoDB / live call

                # Fallback to DynamoDB
                try:
                    cached_item = cache_table.get_item(Key={'question_hash': cache_key})
                    if 'Item' in cached_item:
                        cached_raw = cached_item['Item']['response_data']
                        cached_str = cached_raw.lower()
                        # Validate: never serve a cached error
                        if not any(err in cached_str for err in ['blocked by aws', 'accessdeniedexception', '"status": "error"', 'error_msg']):
                            return {
                                "statusCode": 200,
                                "headers": headers,
                                "body": json.dumps({"cached": True, "source": "dynamodb", "data": json.loads(cached_raw)})
                            }
                        else:
                            # Delete the bad cached entry so it gets regenerated
                            cache_table.delete_item(Key={'question_hash': cache_key})
                            print(f"Deleted bad cache entry: {cache_key}")
                except Exception:
                    pass

                final_result = asyncio.run(process_consensus_query(query, body.get("attachments")))

            # Only cache successful, non-error results
            result_str = json.dumps(final_result).lower()
            is_error = any(err in result_str for err in [
                'blocked by aws', 'accessdeniedexception', 'invalid_payment_instrument',
                '"status": "error"', 'error_msg'
            ])
            if not is_error:
                aurora.put(cache_key, final_result, query)
                try:
                    cache_table.put_item(Item={
                        'question_hash': cache_key,
                        'query_text':    query,
                        'response_data': json.dumps(final_result),
                        'created_at':    datetime.utcnow().isoformat()
                    })
                except Exception as e:
                    final_result["persistence_error_dynamo"] = str(e)
            else:
                print(f"Skipping cache for error result: {result_str[:120]}")
            
            if aurora.last_error:
                final_result["aurora_error"] = aurora.last_error

            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"cached": False, "data": final_result})
            }

        elif action == "GET_USER_DATA":
            data_type = body.get("data_type", "notes")
            user_key = f"USER_DATA_{username}_{data_type}"
            
            # Try Aurora First
            cached_data = aurora.get(user_key)
            if cached_data is not None:
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"data": cached_data})}

            # Fallback to DynamoDB
            try:
                cached = cache_table.get_item(Key={'question_hash': user_key})
                obj = json.loads(cached['Item']['response_data']) if 'Item' in cached else []
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"data": obj})}
            except Exception as e:
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"data": []})}

        elif action == "SAVE_USER_DATA":
            data_type = body.get("data_type", "notes")
            payload = body.get("payload", [])
            user_key = f"USER_DATA_{username}_{data_type}"
            
            # Write to Aurora
            aurora.put(user_key, payload, f"DATA FOR {username}")
            
            # Write to DynamoDB Fallback
            try:
                cache_table.put_item(Item={
                    'question_hash': user_key,
                    'query_text': f"DATA FOR {username}",
                    'response_data': json.dumps(payload),
                    'created_at': datetime.utcnow().isoformat()
                })
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"success": True})}
            except Exception as e:
                return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}
                
        elif action == "DELETE_USER_DATA":
            data_type = body.get("data_type", "notes")
            user_key = f"USER_DATA_{username}_{data_type}"
            
            # Delete from Aurora
            try:
                with aurora.get_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("DELETE FROM cache WHERE question_hash = %s", (user_key,))
                    conn.commit()
            except Exception as e:
                pass # Fail silently, try dynamo
                
            # Delete from DynamoDB
            try:
                cache_table.delete_item(Key={'question_hash': user_key})
                return {"statusCode": 200, "headers": headers, "body": json.dumps({"success": True})}
            except Exception as e:
                return {"statusCode": 500, "headers": headers, "body": json.dumps({"error": str(e)})}
                
        elif action == "ANALYZE_DATA":
            data_type = body.get("data_type", "notes")
            payload = body.get("payload", "")
            language = body.get("language", "")
            if not payload:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Payload is required for analysis."})}
                
            if data_type == "notes":
                mode = body.get("mode", "analyze")
                analysis_result = asyncio.run(process_notes_analysis(payload, mode))
            else:
                analysis_result = asyncio.run(process_ai_analysis(payload, data_type, language))
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"data": analysis_result})}

        elif action == "EXECUTE_CODE":
            code = body.get("code", "")
            language = body.get("language", "Python")
            if not code:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Code is required for execution."})}
            execution_result = asyncio.run(simulate_code_execution(code, language))
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"data": execution_result})}
        
        else:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Unknown action"})}

        
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({"error": str(e)})
        }