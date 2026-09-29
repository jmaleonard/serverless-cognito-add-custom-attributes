const chai = require('chai');
const sinon = require('sinon');
const { CloudFormationClient } = require('@aws-sdk/client-cloudformation');
const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
const CognitoAddCustomAttributesPlugin = require('../index.js');

const expect = chai.expect;

const custom = {
  CognitoAddCustomAttributes: {
    CognitoUserPoolIdOutputKey: 'UserPoolId',
    CognitoUserPoolClientIdOutputKey: 'UserPoolClientId',
    CustomAttributes: [{ AttributeDataType: 'String', Mutable: true, Name: 'tenant' }]
  }
};

const stack = {
  Outputs: [
    { OutputKey: 'UserPoolId', OutputValue: 'eu-west-1_pool' },
    { OutputKey: 'UserPoolClientId', OutputValue: 'client-id' }
  ]
};

const createServerless = (provider) => ({
  getProvider: () => provider,
  cli: { log: () => {} },
  service: { custom }
});

describe('AWS requests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  // osls 4 removed provider.request(); calling it throws AWS_SDK_V2_SURFACE_REMOVED.
  it('should add missing attributes through SDK v3 clients on osls 4', async () => {
    const sent = [];
    sandbox.stub(CloudFormationClient.prototype, 'send').callsFake(async (command) => {
      sent.push([command.constructor.name, command.input]);
      return { Stacks: [stack] };
    });
    sandbox.stub(CognitoIdentityProviderClient.prototype, 'send').callsFake(async (command) => {
      sent.push([command.constructor.name, command.input]);
      switch (command.constructor.name) {
        case 'DescribeUserPoolCommand':
          return { UserPool: { SchemaAttributes: [{ Name: 'email' }] } };
        case 'DescribeUserPoolClientCommand':
          return {
            UserPoolClient: {
              UserPoolId: 'eu-west-1_pool',
              ClientId: 'client-id',
              ClientSecret: 'secret',
              ReadAttributes: ['email'],
              WriteAttributes: ['email']
            }
          };
        default:
          return {};
      }
    });
    const provider = {
      naming: { getStackName: () => 'service-dev' },
      getAwsSdkV3Config: async () => ({ region: 'eu-west-1' }),
      request: () => {
        throw new Error('AWS_SDK_V2_SURFACE_REMOVED');
      }
    };

    await new CognitoAddCustomAttributesPlugin(createServerless(provider), {}).postDeploy();

    expect(sent).to.deep.equal([
      ['DescribeStacksCommand', { StackName: 'service-dev' }],
      ['DescribeUserPoolCommand', { UserPoolId: 'eu-west-1_pool' }],
      [
        'AddCustomAttributesCommand',
        { UserPoolId: 'eu-west-1_pool', CustomAttributes: custom.CognitoAddCustomAttributes.CustomAttributes }
      ],
      ['DescribeUserPoolClientCommand', { ClientId: 'client-id', UserPoolId: 'eu-west-1_pool' }],
      [
        'UpdateUserPoolClientCommand',
        {
          UserPoolId: 'eu-west-1_pool',
          ClientId: 'client-id',
          ReadAttributes: ['email', 'custom:tenant'],
          WriteAttributes: ['email', 'custom:tenant']
        }
      ]
    ]);
  });

  it('should fall back to provider.request() on Serverless 3 / osls 3', async () => {
    const request = sandbox.stub().callsFake(async (service, method) => {
      switch (method) {
        case 'describeStacks':
          return { Stacks: [stack] };
        case 'describeUserPool':
          return { UserPool: { SchemaAttributes: [{ Name: 'custom:tenant' }] } };
        default:
          return {};
      }
    });
    const provider = { naming: { getStackName: () => 'service-dev' }, request };
    const serverless = createServerless(provider);
    serverless.service.custom = {
      CognitoAddCustomAttributes: { ...custom.CognitoAddCustomAttributes, CognitoUserPoolClientIdOutputKey: undefined }
    };

    await new CognitoAddCustomAttributesPlugin(serverless, {}).postDeploy();

    expect(request.args.map((args) => args.slice(0, 2))).to.deep.equal([
      ['CloudFormation', 'describeStacks'],
      ['CognitoIdentityServiceProvider', 'describeUserPool']
    ]);
  });
});
