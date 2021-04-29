const _ = require('lodash');
const helperMethods = require('./helperMethods');

const Name = 'CognitoAddCustomAttributesPlugin';

const loadCustom = helperMethods.loadCustom;
const Params = helperMethods.Params;
const describeStack = helperMethods.describeStack;

class CognitoAddCustomAttributesPluginError extends Error {
  constructor(error, innerMessage) {
    super(error.message);
    this.name = 'CognitoAddCustomAttributesPluginError';

    this.innerMessage = innerMessage;
    Error.captureStackTrace(error, CognitoAddCustomAttributesPluginError);
  }
}

const findOutputId = (custom, stack, outputKey) => {
  if (stack) {
    const output = _.find(
      stack.Outputs,
      (output) => output.OutputKey === custom[outputKey]
    );
    if (output) {
      const outputId = _.get(output, 'OutputValue');
      return outputId;
    } else {
      throw new Error(`Could not find ${outputKey} in Outputs for stack.`);
    }
  }
};

const describeCognitoUserPool = async (AWS, userPoolId) => {
  try {
    const describeParams = {
      UserPoolId: userPoolId
    };

    const response = await AWS.request(
      'CognitoIdentityServiceProvider',
      'describeUserPool',
      describeParams
    );
    return response.UserPool;
  } catch (error) {
    throw new CognitoAddCustomAttributesPluginError(
      error,
      'Error occurred when fetching UserPool'
    );
  }
};

const describeCognitoUserPoolClient = async (
  AWS,
  userPoolId,
  userPoolClientId
) => {
  try {
    const describeParams = {
      ClientId: userPoolClientId,
      UserPoolId: userPoolId
    };

    const response = await AWS.request(
      'CognitoIdentityServiceProvider',
      'describeUserPoolClient',
      describeParams
    );
    return response.UserPoolClient;
  } catch (error) {
    throw new CognitoAddCustomAttributesPluginError(
      error,
      'Error occurred when fetching UserPoolClient'
    );
  }
};

const transformAttributeName = (name) => {
  let customName = name;
  if (!_.startsWith(customName, 'custom:')) {
    customName = `custom:${customName}`;
  }
  return customName;
};

const getMissingAttributes = (newAttributes, existingAttributeNames) => {
  return _.filter(newAttributes, (newAttribute) => {
    let customName = transformAttributeName(newAttribute.Name);

    const exists = _.some(
      existingAttributeNames,
      (existingName) => existingName == customName
    );
    return !exists;
  });
};

const addNewCustomAttributesToUserPool = async (
  AWS,
  log,
  userPoolId,
  newAttributes
) => {
  if (!_.isEmpty(newAttributes)) {
    try {
      const addCustomAttributesParams = {
        UserPoolId: userPoolId,
        CustomAttributes: newAttributes
      };

      log(
        `Adding ${newAttributes.length} attribute(s) to pool: ${_.join(
          _.map(newAttributes, (x) => x.Name)
        )}`
      );

      await AWS.request(
        'CognitoIdentityServiceProvider',
        'addCustomAttributes',
        addCustomAttributesParams
      );
      log('Successfully added attributes to pool');
    } catch (error) {
      throw new CognitoAddCustomAttributesPluginError(
        error,
        'Error occurred when adding attributes to pool'
      );
    }
  } else {
    return log('Supplied attributes already exist in pool');
  }
};

const updateUserPoolClient = async (
  AWS,
  log,
  userPoolClient,
  readAttributes,
  writeAttributes
) => {
  if (readAttributes.length + writeAttributes.length > 0) {
    const readAttributeNames = _.map(readAttributes, (x) =>
      transformAttributeName(x.Name)
    );
    const writeAttributeNames = _.map(writeAttributes, (x) =>
      transformAttributeName(x.Name)
    );

    try {
      let params = {
        ClientId: userPoolClient.ClientId,
        UserPoolId: userPoolClient.UserPoolId,
        ReadAttributes: _.concat(
          userPoolClient.ReadAttributes,
          readAttributeNames
        ),
        WriteAttributes: _.concat(
          userPoolClient.WriteAttributes,
          writeAttributeNames
        )
      };

      if (readAttributeNames.length > 0) {
        log(
          `Enabling client to read from ${
            readAttributeNames.length
          } new attribute(s): ${_.join(readAttributeNames)}`
        );
      }
      if (writeAttributeNames.length > 0) {
        log(
          `Enabling client to write to ${
            writeAttributeNames.length
          } new attribute(s): ${_.join(writeAttributeNames)}`
        );
      }

      await AWS.request(
        'CognitoIdentityServiceProvider',
        'updateUserPoolClient',
        params
      );
      log('Successfully updated client');
    } catch (error) {
      throw new CognitoAddCustomAttributesPluginError(
        error,
        'Error occurred when updating client'
      );
    }
  } else {
    return log('No update required to UserPoolClient');
  }
};

class CognitoAddCustomAttributesPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = serverless.getProvider('aws');

    this.hooks = {
      'after:deploy:deploy': this.postDeploy.bind(this)
    };

    this.log = this.log.bind(this);
    this.run = this.run.bind(this);
  }

  async postDeploy() {
    this.custom = loadCustom(this.log, this.serverless.service.custom);

    await this.run();
  }

  async run() {
    const { provider: AWS, custom, log } = this;

    try {
      log('Start');

      const stack = await describeStack(AWS);

      if (Array.isArray(custom)) {
        await Promise.all(
          custom.map((mappingItem) =>
            (async () => {
              // skip empty mapping items
              if (_.isEmpty(mappingItem)) {
                return;
              }

              // if we run more than one at a time, there is a chance for a race condition on creating
              // the customAttribute on the userPool the first time
              await this.processCognitoCustomAttributeMapping(
                stack,
                mappingItem
              );
            })()
          )
        );
      } else {
        await this.processCognitoCustomAttributeMapping(stack, custom);
      }

      log('End');
    } catch (error) {
      log(`run Error [Message: ${error.message}]`);
      if (error.innerMessage) log(`${error.innerMessage}. ${error}`);
      throw error;
    }
  }

  async processCognitoCustomAttributeMapping(stack, mappingItem) {
    const { log, provider: AWS } = this;

    const userPoolId = findOutputId(
      mappingItem,
      stack,
      Params.CognitoUserPoolIdOutputKey
    );
    log(`Found userPoolId: ${userPoolId}`);

    const userPool = await describeCognitoUserPool(AWS, userPoolId);

    const newAttributes = getMissingAttributes(
      mappingItem.CustomAttributes,
      _.map(userPool.SchemaAttributes, 'Name')
    );
    await addNewCustomAttributesToUserPool(AWS, log, userPoolId, newAttributes);

    if ( typeof _.get(mappingItem, Params.CognitoUserPoolClientIdOutputKey) !== 'undefined' ) {
      const userPoolClientId = await findOutputId(
        mappingItem,
        stack,
        Params.CognitoUserPoolClientIdOutputKey
      );

      log(`Found userPoolClientId: ${userPoolClientId}`);
      
      const userPoolClient = await describeCognitoUserPoolClient(
        AWS,
        userPoolId,
        userPoolClientId
      );

      const newReadAttributes = getMissingAttributes(
        mappingItem.CustomAttributes,
        userPoolClient.ReadAttributes
      );
      const newWriteAttributes = getMissingAttributes(
        mappingItem.CustomAttributes,
        userPoolClient.WriteAttributes
      );
      await updateUserPoolClient(
        AWS,
        log,
        userPoolClient,
        newReadAttributes,
        newWriteAttributes
      );
    }
    else {
      log('No param for UserPoolClient found. Will not update any UserPoolClient permissions!');
    }
  }

  log(message) {
    this.serverless.cli.log(`${Name}: ${message}`);
  }
}

module.exports = CognitoAddCustomAttributesPlugin;
