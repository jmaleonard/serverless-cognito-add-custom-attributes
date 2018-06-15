const _ = require('lodash');

const Name = 'CognitoAddCustomAttributesPlugin';

const Params = {
  CognitoUserPoolOutputKey: 'CognitoUserPoolOutputKey',
  CustomAttributes: 'CustomAttributes',
};

class CustomError extends Error {
  constructor(error, innerMessage) {
    super(error.message);
    this.name = 'CustomError';
    
    this.innerMessage = innerMessage;
    Error.captureStackTrace(error, CustomError);
  }
}

class CognitoAddCustomAttributesPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = serverless.getProvider('aws');

    this.hooks = {
      'after:deploy:deploy': this.postDeploy.bind(this),
    };

    this.log = this.log.bind(this);
    this.loadCustom = this.loadCustom.bind(this);
    this.describeStack = this.describeStack.bind(this);
    this.findCognitoUserPool = this.findCognitoUserPool.bind(this);
    this.describeCognitoUserPool = this.describeCognitoUserPool.bind(this);
    this.intersectExistingAttributes = this.intersectExistingAttributes.bind(this);
    this.addNewCustomAttributes = this.addNewCustomAttributes.bind(this);
    this.run = this.run.bind(this);
  }

  postDeploy() {
    return new Promise((resolve, reject) => {
      this.pluginCustom = this.loadCustom(this.serverless.service.custom);

      if (_.has(this.pluginCustom, Params.CognitoUserPoolOutputKey) && _.has(this.pluginCustom, Params.CustomAttributes)) {
        return this.run().then(() => resolve());
      } else {
        this.log('Missing required fields.');
        return reject('Missing required fields.');
      }
    });
  }

  loadCustom(custom){
    let pluginCustom = {};
    if (custom && custom.addCustomCognitoAttributes) {

      const CognitoUserPoolOutputKey = _.get(custom.addCustomCognitoAttributes, Params.CognitoUserPoolOutputKey);
      const CustomAttributes = _.get(custom.addCustomCognitoAttributes, Params.CustomAttributes);

      if (!CognitoUserPoolOutputKey || !(typeof(CognitoUserPoolOutputKey) === 'string')) {
        this.log('CognitoUserPoolOutputKey is required.');
      } else if (!CustomAttributes || !Array.isArray(CustomAttributes)) {
        this.log('CustomAttributes array is required.');
      } else {
        pluginCustom.CognitoUserPoolOutputKey = CognitoUserPoolOutputKey;
        pluginCustom.CustomAttributes = CustomAttributes;
      }
    }

    return pluginCustom;
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

      this.describeStack()
        .then(this.findCognitoUserPool)
        .then(this.describeCognitoUserPool)
        .then(this.intersectExistingAttributes)
        .then(this.addNewCustomAttributes)
        .then(success)
        .catch(error => failure(error, error.innerMessage));
    });
  }

  describeStack() {
    return this.provider.request('CloudFormation', 'describeStacks', { StackName: this.provider.naming.getStackName() })
      .then(response => _.first(response.Stacks));
  }

  findCognitoUserPool(stack) {
    if (stack) {
      const userPoolOutput = _.find(stack.Outputs, output => output.OutputKey === this.pluginCustom[Params.CognitoUserPoolOutputKey]);
      if (userPoolOutput) {
        this.userPoolId = _.get(userPoolOutput, 'OutputValue');
        return this.userPoolId;
      } else {
        throw new Error(`Could not find ${Params.CognitoUserPoolOutputKey} in Outputs for stack.`);
      }
    }
  }

  describeCognitoUserPool(userPoolId) {
    const describeParams = {
      UserPoolId: userPoolId
    };

    return this.provider.request('CognitoIdentityServiceProvider', 'describeUserPool', describeParams)
      .then(userPoolResponse => userPoolResponse.UserPool)
      .catch(error => {
        throw new CustomError(error, 'Error occurred when fetching existing attributes');
      });
  }

  intersectExistingAttributes(userPool) {
    const existingAttributeNames = _.map(userPool.SchemaAttributes, attributes => attributes.Name);

    return _.filter(this.pluginCustom.CustomAttributes, newAttribute => {
      const customName = _.replace(newAttribute.Name, /^custom\:/, 'custom:');
      return _.some(existingAttributeNames, existingName => existingName == customName);
    });
  }

  addNewCustomAttributes(newAttributes) {
    if (!_.isEmpty(newAttributes)) {
      const addCustomAttributesParams = {
        UserPoolId: this.userPoolId,
        CustomAttributes: newAttributes
      };

      return this.provider.request('CognitoIdentityServiceProvider', 'addCustomAttributes', addCustomAttributesParams)
        .then(() => this.log('Successfully added attributes'))
        .catch(error => {
          throw new CustomError(error, 'Error occurred when adding attributes');
        });
    } else {
      this.log('Supplied attributes already exist.');
    }
  }

  log(message) {
    this.serverless.cli.log(`${Name}: ${message}`);
  }
}

module.exports = CognitoAddCustomAttributesPlugin;
