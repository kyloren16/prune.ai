import json

def lambda_handler(event, context):
    print("CloudScope Explainer Triggered")
    return {
        'statusCode': 200,
        'body': json.dumps('Explainer executed')
    }
