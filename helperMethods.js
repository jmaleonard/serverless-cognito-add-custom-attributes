const _ = require('lodash');

const Params = {
  CognitoUserPoolIdOutputKey: 'CognitoUserPoolIdOutputKey',
  CustomAttributes: 'CustomAttributes',
  CognitoUserPoolClientIdOutputKey: 'CognitoUserPoolClientIdOutputKey',
};

const V3_CLIENTS = {
  CloudFormation: ['@aws-sdk/client-cloudformation', 'CloudFormationClient'],
  CognitoIdentityServiceProvider: ['@aws-sdk/client-cognito-identity-provider', 'CognitoIdentityProviderClient']
};
const v3Clients = new WeakMap();

// osls 4 removed the SDK v2 provider.request() proxy and exposes getAwsSdkV3Config() instead.
// Serverless Framework 3 and osls 3 only offer provider.request().
const request = async (provider, service, method, params) => {
  if (typeof provider.getAwsSdkV3Config !== 'function') {
    return provider.request(service, method, params);
  }

  const [packageName, clientName] = V3_CLIENTS[service];
  const sdk = require(packageName);
  if (!v3Clients.has(provider)) {
    v3Clients.set(provider, {});
  }
  const clients = v3Clients.get(provider);
  if (!clients[service]) {
    clients[service] = provider.getAwsSdkV3Config().then((config) => new sdk[clientName](config));
  }
  const client = await clients[service];
  const Command = sdk[`${method[0].toUpperCase()}${method.slice(1)}Command`];

  return client.send(new Command(params));
};

const describeStack = async (AWS) => {
  const response = await request(AWS, 'CloudFormation', 'describeStacks', { StackName: AWS.naming.getStackName() });
  return _.first(response.Stacks);
};

const loadCustom = (log, custom) => {
  let result = [];
  if (custom && custom.CognitoAddCustomAttributes) {
    
    if(Array.isArray(custom.CognitoAddCustomAttributes)) {
      custom.CognitoAddCustomAttributes.forEach(cognitoCustomAttributeMappingItem => {
        result.push(parseCustomItem(log, cognitoCustomAttributeMappingItem));
      });
    } else {
      result.push(parseCustomItem(log, custom.CognitoAddCustomAttributes));
    }
  }
  
  return result;
};

const parseCustomItem = (log, item) => {
  const result = {};
  let skippingItem = false;
  
  const CognitoUserPoolIdOutputKey = _.get(item, Params.CognitoUserPoolIdOutputKey);
  const CustomAttributes = _.get(item, Params.CustomAttributes);
  const CognitoUserPoolClientIdOutputKey = _.get(item, Params.CognitoUserPoolClientIdOutputKey);
  
  if (!CognitoUserPoolIdOutputKey || !(typeof(CognitoUserPoolIdOutputKey) === 'string')) {
    log('CognitoUserPoolIdOutputKey is required.');
    skippingItem = true;
  } else if (!CustomAttributes || !Array.isArray(CustomAttributes)) {
    log('CustomAttributes array is required.');
    skippingItem = true;
  } else {
    result.CognitoUserPoolIdOutputKey = CognitoUserPoolIdOutputKey;
    result.CustomAttributes = CustomAttributes;
    result.CognitoUserPoolClientIdOutputKey = CognitoUserPoolClientIdOutputKey;
  }
  
  if(skippingItem) {
    log(`Custom Attribute is being skipped due to missing information. [CognitoUserPoolIdOutputKey: ${CognitoUserPoolIdOutputKey}] [CognitoUserPoolClientIdOutputKey: ${CognitoUserPoolClientIdOutputKey}]`);
  }
  
  return result;
};

module.exports = {
  Params,
  request,
  loadCustom,
  describeStack
};
