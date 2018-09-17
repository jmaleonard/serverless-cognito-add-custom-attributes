const _ = require('lodash');

const Params = {
  CognitoUserPoolIdOutputKey: 'CognitoUserPoolIdOutputKey',
  CustomAttributes: 'CustomAttributes',
  CognitoUserPoolClientIdOutputKey: 'CognitoUserPoolClientIdOutputKey',
};

const describeStack = async (AWS) => {
  const response = await AWS.request('CloudFormation', 'describeStacks', { StackName: AWS.naming.getStackName() });
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
  loadCustom,
  describeStack
};
