import os
import aws_cdk as cdk
from dotenv import load_dotenv

load_dotenv()

from consensus_bedrock_backend.consensus_bedrock_stack import ConsensusBedrockStack

app = cdk.App()


ConsensusBedrockStack(app, "ConsensusBedrockStack",

    env=cdk.Environment(
        account=os.getenv('CDK_DEFAULT_ACCOUNT'), 
        region=os.getenv('CDK_DEFAULT_REGION')
    )
)

app.synth()
