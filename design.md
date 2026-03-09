# Design Document - Consensus Bedrock Architecture

## 1. System Architecture
The system follows a serverless, event-driven architecture built on AWS.

### 1.1 Architecture Diagram
Refer to `images/architecture_diagram.png` for a visual representation of the data flow.

## 2. Component Design

### 2.1 Smart Router (AWS Lambda)
The core logic resides in a single high-performance Python Lambda function.
- **Handler**: `lambda_handler` in `lambda/lambda_function.py`.
- **Dispatcher**: Concurrently invokes worker agents using `asyncio.gather`.
- **Scoring Engine**: Implements the 7-metric evaluation logic locally for speed, using external API calls only for "Confidence" and "Hallucination" checks.

### 2.2 Data Layer
- **Amazon DynamoDB**: Used for the Semantic Cache. Partition Key: `question_hash` (MD5 of query).
- **Amazon Aurora (Serverless v2)**: Stores structured user data and persistent state. Uses the Data API for connectionless execution, reducing Lambda cold-start times.

### 2.3 AI Orchestration (Models)
- **Workers**: 
  - `Llama 4 Scout 17B`: Primary worker for coding and logic.
  - `Ministral 8B`: Secondary worker for variety and theoretical explanations.
- **Judge**: 
  - `Amazon Nova Pro`: Invoked for conflict resolution, final score aggregation, and high-complexity deep dives.

## 3. Logic Flows

### 3.1 Consensus Pipeline
1. **Cache Check**: MD5 hash of query checked against DynamoDB.
2. **Parallel Generation**: Llama 4 and Ministral generate answers simultaneously.
3. **Multi-Metric Scoring**:
   - Confidence (Judge)
   - Hallucination (Judge)
   - Keyword Match (Python/Regex)
   - Readability (Flesch-Kincaid)
   - Length/Repetition/Specificity (Python/Regex)
4. **Decision**:
   - If `score > 0.75`: Return worker answer.
   - If `score <= 0.75`: Invoke Nova Pro to "Fix" the answer.

### 3.2 Adaptive Throttling
Uses `botocore.config.Config` with `adaptive` retry mode to handle Bedrock rate limits silently.

## 4. Infrastructure (AWS CDK)
The infrastructure is defined as code in `consensus_bedrock_backend/consensus_bedrock_stack.py`.
- **IAM Roles**: Least-privilege access to Bedrock, DynamoDB, and Aurora.
- **Lambda Function URL**: Provides a direct HTTPS endpoint for the frontend without the overhead of API Gateway.
- **Amplify**: Configured for CI/CD, auto-deploying the `frontend-app` on every push to the `main` branch.
