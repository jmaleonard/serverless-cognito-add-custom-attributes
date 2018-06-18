const _ = require('lodash');

const Name = 'CognitoAddCustomAttributesPlugin';

const Params = {
  CognitoUserPoolIdOutputKey: 'CognitoUserPoolIdOutputKey',
  CustomAttributes: 'CustomAttributes',
  CognitoUserPoolClientIdOutputKey: 'CognitoUserPoolClientIdOutputKey',
};

class CognitoAddCustomAttributesPluginError extends Error {
  constructor(error, innerMessage) {
    super(error.message);
    this.name = 'CognitoAddCustomAttributesPluginError';
    
    this.innerMessage = innerMessage;
    Error.captureStackTrace(error, CognitoAddCustomAttributesPluginError);
  }
}

const loadCustom = function (log, custom) {
  let result = {};
  if (custom && custom.addCustomCognitoAttributes) {

    const CognitoUserPoolIdOutputKey = _.get(custom.addCustomCognitoAttributes, Params.CognitoUserPoolIdOutputKey);
    const CustomAttributes = _.get(custom.addCustomCognitoAttributes, Params.CustomAttributes);
    const CognitoUserPoolClientIdOutputKey = _.get(custom.addCustomCognitoAttributes, Params.CognitoUserPoolClientIdOutputKey);

    if (!CognitoUserPoolIdOutputKey || !(typeof(CognitoUserPoolIdOutputKey) === 'string')) {
      log('CognitoUserPoolIdOutputKey is required.');
    } else if (!CustomAttributes || !Array.isArray(CustomAttributes)) {
      log('CustomAttributes array is required.');
    } else {
      result.CognitoUserPoolIdOutputKey = CognitoUserPoolIdOutputKey;
      result.CustomAttributes = CustomAttributes;
      result.CognitoUserPoolClientIdOutputKey = CognitoUserPoolClientIdOutputKey;
    }
  }

  return result;
};

const describeStack = function(AWS) {
  return AWS.request('CloudFormation', 'describeStacks', { StackName: AWS.naming.getStackName() })
    .then(response => _.first(response.Stacks));
};

const findOutputId = function(custom, stack, outputKey) {
  if (stack) {
    const output = _.find(stack.Outputs, output => output.OutputKey === custom[outputKey]);
    if (output) {
      const outputId = _.get(output, 'OutputValue');
      return outputId;
    } else {
      throw new Error(`Could not find ${outputKey} in Outputs for stack.`);
    }
  }
};

const describeCognitoUserPool = function (AWS, userPoolId) {
  const describeParams = {
    UserPoolId: userPoolId
  };

  return AWS.request('CognitoIdentityServiceProvider', 'describeUserPool', describeParams)
    .then(response => response.UserPool)
    .catch(error => {
      throw new CognitoAddCustomAttributesPluginError(error, 'Error occurred when fetching UserPool');
    });   
};

const describeCognitoUserPoolClient = function (AWS, userPoolId, userPoolClientId) {
  const describeParams = {
    ClientId: userPoolClientId,
    UserPoolId: userPoolId
  };

  return AWS.request('CognitoIdentityServiceProvider', 'describeUserPoolClient', describeParams)
    .then(response => response.UserPoolClient)
    .catch(error => {
      throw new CognitoAddCustomAttributesPluginError(error, 'Error occurred when fetching UserPoolClient');
    });   
};

const getMissingAttributes = function(newAttributes, existingAttributeNames) {
  return _.filter(newAttributes, newAttribute => {

    let customName = newAttribute.Name;
    if (!_.startsWith(customName, 'custom:')) {
      customName = `custom:${customName}`;
    }

    const exists = _.some(existingAttributeNames, existingName => existingName == customName);
    return !exists;
  });
};

const addNewCustomAttributesToUserPool = function(AWS, log, userPoolId, newAttributes) {
  if (!_.isEmpty(newAttributes)) {
    const addCustomAttributesParams = {
      UserPoolId: userPoolId,
      CustomAttributes: newAttributes
    };

    log(`Adding ${newAttributes.length} attribute(s) to pool: ${_.join(_.map(newAttributes, x => x.Name))}`);

    return AWS.request('CognitoIdentityServiceProvider', 'addCustomAttributes', addCustomAttributesParams)
      .then(() => 'Successfully added attributes to pool')
      .catch(error => {
        throw new CognitoAddCustomAttributesPluginError(error, 'Error occurred when adding attributes to pool');
      });
  } else {
    return 'Supplied attributes already exist in pool';
  }
};

const updateUserPoolClient = function(AWS, log, userPoolClient, readAttributes, writeAttributes) {
  if (readAttributes.length + writeAttributes.length > 0) {

    readAttributes = _.map(readAttributes, x => {
      let customName = x.Name;
      if (!_.startsWith(customName, 'custom:')) {
        customName = `custom:${customName}`;
      }
      return customName;
    });
    
    writeAttributes = _.map(writeAttributes, x => {
      let customName = x.Name;
      if (!_.startsWith(customName, 'custom:')) {
        customName = `custom:${customName}`;
      }
      return customName;
    });

    let params = {
      ClientId: userPoolClient.ClientId,
      UserPoolId: userPoolClient.UserPoolId,
      ReadAttributes: _.concat(userPoolClient.ReadAttributes, readAttributes),
      WriteAttributes: _.concat(userPoolClient.WriteAttributes, writeAttributes),
    };

    log(`Enabling client to read from ${readAttributes.length} new attribute(s): ${_.join(readAttributes)}`);
    log(`Enabling client to write to ${writeAttributes.length} attribute(s): ${_.join(writeAttributes)}`);

    return AWS.request('CognitoIdentityServiceProvider', 'updateUserPoolClient', params)
      .then(() => 'Successfully updated client')
      .catch(error => {
        throw new CognitoAddCustomAttributesPluginError(error, 'Error occurred when updating client');
      });
  } else {
    return 'No update required to UserPoolClient';
  }
};

class CognitoAddCustomAttributesPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = serverless.getProvider('aws');

    this.hooks = {
      'after:deploy:deploy': this.postDeploy.bind(this),
    };

    this.log = this.log.bind(this);
    this.run = this.run.bind(this);
  }

  postDeploy() {
    return new Promise((resolve, reject) => {
      this.custom = loadCustom(this.log, this.serverless.service.custom);

      if (_.has(this.custom, Params.CognitoUserPoolIdOutputKey) && _.has(this.custom, Params.CustomAttributes)) {
        return this.run().then(() => resolve());
      } else {
        this.log('Missing required fields.');
        return reject('Missing required fields.');
      }
    });
  }

  run() {
    return new Promise((resolve, reject) => {
      const success = (message) => {
        if (message) this.log(`${message}.`);
        resolve();
      };

      const failure = (error, message) => {
        if (message) this.log(`${message}. ${error}`);
        reject(error);
      };

      const AWS = this.provider;

      describeStack(AWS)
        .then(stack => {
          this.stack = stack;
          this.userPoolId = findOutputId(this.custom, this.stack, Params.CognitoUserPoolIdOutputKey);
          this.log(`Found userPoolId: ${this.userPoolId}`);
        })
        .then(() => describeCognitoUserPool(AWS, this.userPoolId))
        .then(userPool => getMissingAttributes(this.custom.CustomAttributes, _.map(userPool.SchemaAttributes, 'Name')))
        .then(newAttributes => addNewCustomAttributesToUserPool(AWS, this.log, this.userPoolId, newAttributes))
        .then(() => {
          this.userPoolClientId = findOutputId(this.custom, this.stack, Params.CognitoUserPoolClientIdOutputKey);
          this.log(`Found userPoolClientId: ${this.userPoolClientId}`);
        })
        .then(() => describeCognitoUserPoolClient(AWS, this.userPoolId, this.userPoolClientId))
        .then(userPoolClient => this.userPoolClient = userPoolClient)
        .then(() => {
          this.newReadAttributes = getMissingAttributes(this.custom.CustomAttributes, this.userPoolClient.ReadAttributes);
        })
        .then(() => {
          this.newWriteAttributes = getMissingAttributes(this.custom.CustomAttributes, this.userPoolClient.WriteAttributes);
        })
        .then(() => {
          if (this.newReadAttributes.length > 0 || this.newWriteAttributes.length > 0) {
            return updateUserPoolClient(AWS, this.log, this.userPoolClient, this.newReadAttributes, this.newWriteAttributes);
          }
        })
        .then(success)
        .catch(error => failure(error, error.innerMessage));
    });
  }

  log(message) {
    this.serverless.cli.log(`${Name}: ${message}`);
  }
}

module.exports = CognitoAddCustomAttributesPlugin;
