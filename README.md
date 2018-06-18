# serverless-cognito-add-custom-attributes

This plugin allows you to add custom attributes to an existing CloudFormation-managed Cognito User Pool from serverless without losing all your users. At the time of writing (June 2018) CloudFormation doesn't know how to add custom attributes to a user pool without dropping and re-creating it, thus losing all your users.

# Requirements
- Node 8+
- serverless 1+

# Usage

```yml
plugins:
    - custom-serverless-plugin

custom:
  CognitoAddCustomAttributes: 
    CognitoUserPoolIdOutputKey: "CognitoUserPoolApplicationUserPoolId" 
    CustomAttributes: 
      - 
        AttributeDataType: String
        DeveloperOnlyAttribute: False
        Mutable: True
        Name: "another" # this will end up being custom:another 
        Required: False

resources:
  Resources:
    # The definition of your user pool (in this example it is in a separate file)
    CognitoUserPoolApplicationUserPool: ${file(./CognitoUserPool.yml):UserPool}
  Outputs:
    CognitoUserPoolApplicationUserPoolId:
      Value:
        Ref: CognitoUserPoolApplicationUserPool
```

# Details

1. Output your UserPoolId via `resouces.Outputs`
2. Add `CognitoAddCustomAttributes` to `custom` with the following structure:
```yml
  CognitoUserPoolIdOutputKey: "Output Key as a String"
  CustomAttributes:
    - 
        AttributeDataType: String
        DeveloperOnlyAttribute: False
        Mutable: True
        Name: "another"
        Required: False
```

The names of your attributes supplied here will appear as `custom:{name}` when deployed.

For more information on the schema of attributes see:
https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SchemaAttributeType.html