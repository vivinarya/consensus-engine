# Requirements Document: Consensus Bedrock

## Introduction

Consensus Bedrock is a multi-agent AI system designed to provide high-quality, verified answers by orchestrating multiple LLMs on AWS Bedrock. The system prioritizes cost-efficiency by using small "worker" models (Llama 4 Scout and Ministral 8B) and only invoking a "judge" model (Amazon Nova Pro) when consensus or quality thresholds are not met. This approach ensures accurate, hallucination-free responses while maintaining operational costs below $0.00001 per query.

## Project Overview

The Consensus Bedrock Engine addresses the critical challenge of AI hallucinations and inconsistent responses by implementing a cascade pattern with quantitative scoring. By evaluating worker responses against a 7-metric scoring engine and selectively invoking a judge model only when needed, the system achieves both high accuracy and cost efficiency.

## Glossary

- **Consensus_System**: The complete Consensus Bedrock Engine application
- **Smart_Router**: AWS Lambda function that orchestrates worker agents and scoring logic
- **Worker_Models**: Small, cost-efficient LLMs (Llama 4 Scout 17B, Ministral 8B) that generate initial responses
- **Judge_Model**: Amazon Nova Pro - invoked for conflict resolution and quality enhancement
- **Scoring_Engine**: 7-metric evaluation system (Confidence, Hallucination, Keyword Match, Length, Repetition, Readability, Specificity)
- **Semantic_Cache**: DynamoDB-based caching system using MD5 query hashing
- **Deep_Dive**: Technical analysis feature where Judge model compares worker responses in detail
- **Frontend_Dashboard**: React-based user interface for query submission and score visualization
- **Aurora_DB**: Amazon Aurora PostgreSQL Serverless v2 for persistent user data
- **Weighted_Score**: Aggregate score from 7 metrics, threshold set at 0.75

## Requirements

### Requirement 1: Multi-Agent Query Routing

**User Story:** As a user, I want my query to be processed by multiple AI models simultaneously, so that I can receive diverse perspectives and reduce the risk of hallucinations.

#### Acceptance Criteria

1. WHEN a user submits a query, THE Smart_Router SHALL route the query to at least two Worker_Models concurrently
2. THE Smart_Router SHALL use Llama 4 Scout 17B as the primary Worker_Model for coding and logic queries
3. THE Smart_Router SHALL use Ministral 8B as the secondary Worker_Model for variety and theoretical explanations
4. WHEN routing queries, THE Smart_Router SHALL use asyncio.gather for concurrent invocation
5. THE Smart_Router SHALL complete worker invocations within 5 seconds

### Requirement 2: Quantitative Response Scoring

**User Story:** As a system administrator, I want every AI response to be evaluated against objective metrics, so that I can ensure quality and identify when judge intervention is needed.

#### Acceptance Criteria

1. WHEN Worker_Models return responses, THE Scoring_Engine SHALL evaluate each response against 7 metrics
2. THE Scoring_Engine SHALL calculate Confidence score using Judge_Model API
3. THE Scoring_Engine SHALL calculate Hallucination score using Judge_Model API
4. THE Scoring_Engine SHALL calculate Keyword Match score using Python regex locally
5. THE Scoring_Engine SHALL calculate Length score using Python locally
6. THE Scoring_Engine SHALL calculate Repetition score using Python regex locally
7. THE Scoring_Engine SHALL calculate Readability score using Flesch-Kincaid algorithm locally
8. THE Scoring_Engine SHALL calculate Specificity score using Python regex locally
9. THE Scoring_Engine SHALL compute a Weighted_Score by aggregating all 7 metrics
10. THE Scoring_Engine SHALL complete scoring within 2 seconds

### Requirement 3: Adaptive Judge Invocation

**User Story:** As a cost-conscious administrator, I want the expensive judge model to be invoked only when necessary, so that we maintain low operational costs while ensuring quality.

#### Acceptance Criteria

1. WHEN the Weighted_Score of worker responses is below 0.75, THE Smart_Router SHALL invoke the Judge_Model
2. WHEN the Weighted_Score is 0.75 or above, THE Smart_Router SHALL return the best worker response without judge invocation
3. WHEN Judge_Model is invoked, THE Smart_Router SHALL use Amazon Nova Pro
4. WHEN Judge_Model provides a response, THE Smart_Router SHALL use it as the definitive answer
5. THE Consensus_System SHALL maintain an average query cost below $0.00001

### Requirement 4: Semantic Caching

**User Story:** As a user, I want repeated or similar queries to return instantly, so that I don't waste time waiting for the same answer to be regenerated.

#### Acceptance Criteria

1. WHEN a query is submitted, THE Semantic_Cache SHALL compute an MD5 hash of the query text
2. WHEN checking cache, THE Semantic_Cache SHALL use the MD5 hash as the DynamoDB partition key
3. WHEN a cache hit occurs, THE Semantic_Cache SHALL return the cached response within 50ms
4. WHEN a cache miss occurs, THE Semantic_Cache SHALL proceed with worker model invocation
5. WHEN a new response is generated, THE Semantic_Cache SHALL store the query hash and response in DynamoDB
6. THE Semantic_Cache SHALL set a TTL of 24 hours for cached entries

### Requirement 5: Real-Time User Interface

**User Story:** As a user, I want an intuitive dashboard to submit queries and view detailed AI score breakdowns, so that I can understand how my answer was generated and validated.

#### Acceptance Criteria

1. THE Frontend_Dashboard SHALL be implemented using React framework
2. WHEN a user visits the application, THE Frontend_Dashboard SHALL display a query input interface
3. WHEN results are received, THE Frontend_Dashboard SHALL display all 7 metric scores with visual indicators
4. WHEN displaying scores, THE Frontend_Dashboard SHALL show the Weighted_Score prominently
5. THE Frontend_Dashboard SHALL indicate whether the Judge_Model was invoked
6. THE Frontend_Dashboard SHALL provide real-time loading indicators during query processing

### Requirement 6: Deep Dive Analysis

**User Story:** As a developer, I want to request a detailed technical comparison of worker responses, so that I can understand the reasoning differences and make informed decisions.

#### Acceptance Criteria

1. WHEN viewing results, THE Frontend_Dashboard SHALL provide a "Deep Dive" button
2. WHEN Deep Dive is requested, THE Smart_Router SHALL invoke the Judge_Model to compare worker responses
3. WHEN Judge_Model analyzes responses, THE Smart_Router SHALL request detailed technical comparison
4. WHEN Deep Dive completes, THE Frontend_Dashboard SHALL display side-by-side worker responses with judge commentary
5. THE Deep Dive feature SHALL complete within 8 seconds

### Requirement 7: Learning Progress Tracking

**User Story:** As a student, I want the system to track my learning progress and generate flashcards, so that I can revise concepts based on my previous queries.

#### Acceptance Criteria

1. WHEN a user submits queries, THE Consensus_System SHALL track user interactions in Aurora_DB
2. WHEN a user requests flashcards, THE Consensus_System SHALL generate flashcards based on previous queries
3. WHEN generating flashcards, THE Consensus_System SHALL use query topics and key concepts
4. THE Consensus_System SHALL store learning notes in Aurora_DB
5. THE Frontend_Dashboard SHALL display learning progress metrics

### Requirement 8: Relational Data Persistence

**User Story:** As a system administrator, I want persistent storage for user data and learning progress, so that users can access their history across sessions.

#### Acceptance Criteria

1. THE Consensus_System SHALL use Amazon Aurora PostgreSQL Serverless v2 for persistent storage
2. WHEN storing user data, THE Aurora_DB SHALL use the Data API for connectionless execution
3. THE Aurora_DB SHALL store user profiles, query history, and learning notes
4. THE Aurora_DB SHALL maintain referential integrity between users and their queries
5. THE Aurora_DB SHALL support queries with response times under 200ms

### Requirement 9: Fallback Metadata Caching

**User Story:** As a system architect, I want a high-speed secondary cache for metadata, so that the system remains performant even under heavy load.

#### Acceptance Criteria

1. THE Consensus_System SHALL use DynamoDB as a secondary persistence layer for metadata
2. WHEN storing metadata, THE Consensus_System SHALL cache frequently accessed data in DynamoDB
3. THE DynamoDB cache SHALL serve metadata requests within 10ms
4. THE Consensus_System SHALL synchronize metadata between DynamoDB and Aurora_DB
5. THE DynamoDB cache SHALL use on-demand billing mode for cost efficiency

### Requirement 10: Performance and Latency

**User Story:** As a user, I want fast response times, so that I can get answers quickly without frustrating delays.

#### Acceptance Criteria

1. WHEN a cached query is requested, THE Consensus_System SHALL return results within 100ms
2. WHEN processing live multi-agent queries, THE Consensus_System SHALL return results within 5 seconds
3. WHEN worker models are invoked, THE Smart_Router SHALL use concurrent execution to minimize latency
4. THE Consensus_System SHALL maintain p95 latency below 6 seconds for uncached queries
5. THE Frontend_Dashboard SHALL display partial results as they become available

### Requirement 11: High Availability

**User Story:** As a system administrator, I want the system to remain available even during regional model outages, so that users experience minimal disruption.

#### Acceptance Criteria

1. THE Consensus_System SHALL use AWS Cross-Region Inference profiles (us.*) for Bedrock models
2. WHEN a regional model endpoint fails, THE Smart_Router SHALL automatically failover to another region
3. THE Consensus_System SHALL maintain 99.9% uptime
4. WHEN failover occurs, THE Smart_Router SHALL log the event for monitoring
5. THE Consensus_System SHALL use adaptive retry mode with exponential backoff

### Requirement 12: Cost Control and Efficiency

**User Story:** As a budget-conscious administrator, I want to minimize AI inference costs, so that the system remains economically sustainable at scale.

#### Acceptance Criteria

1. THE Consensus_System SHALL maintain an average query cost below $0.00001
2. WHEN worker responses meet quality thresholds, THE Smart_Router SHALL avoid judge invocation
3. THE Consensus_System SHALL use the smallest viable models for worker agents
4. THE Consensus_System SHALL cache aggressively to reduce redundant API calls
5. THE Consensus_System SHALL log cost metrics for each query type

### Requirement 13: Rate Limiting and Abuse Prevention

**User Story:** As a system administrator, I want to prevent API abuse, so that the system remains available for legitimate users.

#### Acceptance Criteria

1. THE Consensus_System SHALL enforce a rate limit of 60 requests per minute per IP address
2. WHEN rate limits are exceeded, THE Smart_Router SHALL return HTTP 429 status code
3. THE Smart_Router SHALL include retry-after headers in rate limit responses
4. THE Consensus_System SHALL use DynamoDB to track request counts per IP
5. THE Consensus_System SHALL reset rate limit counters every 60 seconds

### Requirement 14: Error Handling and Resilience

**User Story:** As a user, I want the system to handle errors gracefully, so that I receive useful feedback even when things go wrong.

#### Acceptance Criteria

1. WHEN a Worker_Model fails, THE Smart_Router SHALL continue processing with available workers
2. WHEN all Worker_Models fail, THE Smart_Router SHALL invoke the Judge_Model directly
3. WHEN Judge_Model fails, THE Smart_Router SHALL return an error message with retry instructions
4. THE Smart_Router SHALL use botocore adaptive retry mode to handle Bedrock rate limits
5. WHEN errors occur, THE Consensus_System SHALL log detailed error context to CloudWatch

### Requirement 15: Infrastructure as Code

**User Story:** As a DevOps engineer, I want the entire infrastructure defined as code, so that I can reproduce and version the system reliably.

#### Acceptance Criteria

1. THE Consensus_System infrastructure SHALL be defined using AWS CDK
2. THE CDK stack SHALL provision Lambda functions, DynamoDB tables, Aurora clusters, and IAM roles
3. THE CDK stack SHALL use least-privilege IAM policies for all resources
4. THE CDK stack SHALL configure Lambda Function URLs for direct HTTPS access
5. THE CDK stack SHALL configure AWS Amplify for frontend CI/CD with auto-deployment on main branch commits
