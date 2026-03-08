from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_iam as iam,
    aws_dynamodb as dynamodb,
    Duration,
    CfnOutput
)
from constructs import Construct

class ConsensusBedrockStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        consensus_lambda = _lambda.Function(
            self, 'ConsensusEngineLambda',
            runtime=_lambda.Runtime.PYTHON_3_11,
            code=_lambda.Code.from_asset('lambda'),
            handler='lambda_function.lambda_handler',
            timeout=Duration.seconds(30),
            memory_size=512,
            environment={
                "DB_HOST": "consensus-engine-db.cluster-cspa4wikokmu.us-east-1.rds.amazonaws.com",
                "DB_NAME": "postgres",
                "DB_PORT": "5432",
                "DB_SECRET_ARN": "arn:aws:secretsmanager:us-east-1:192492986116:secret:rds-db-credentials/cluster-4MDJRFADQPWNMEAUX5Y3WSCC4A/postgres/1772819837478-rhzElY",
                "DB_CLUSTER_ARN": "arn:aws:rds:us-east-1:192492986116:cluster:consensus-engine-db"
            }
        )

        consensus_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
            resources=["*"]
        ))

        # Grant access to Data API and Secrets Manager
        consensus_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=[
                "secretsmanager:GetSecretValue",
                "rds-data:ExecuteStatement",
                "rds-data:BatchExecuteStatement"
            ],
            resources=[
                "arn:aws:secretsmanager:us-east-1:192492986116:secret:rds-db-credentials/cluster-4MDJRFADQPWNMEAUX5Y3WSCC4A/postgres/1772819837478-rhzElY",
                "arn:aws:rds:us-east-1:192492986116:cluster:consensus-engine-db"
            ]
        ))

        # Reference the existing DynamoDB table (created manually in the console)
        semantic_cache = dynamodb.Table.from_table_name(
            self, "SemanticCacheTable", "semantic_cache"
        )

        # Grant Lambda read/write access to the cache table
        semantic_cache.grant_read_write_data(consensus_lambda)


        lambda_url = consensus_lambda.add_function_url(
            auth_type=_lambda.FunctionUrlAuthType.NONE,
            cors=_lambda.FunctionUrlCorsOptions(
                allowed_origins=["*"],
                allowed_methods=[_lambda.HttpMethod.POST]
            )
        )

        CfnOutput(self, "ConsensusAPIEndpoint", value=lambda_url.url)