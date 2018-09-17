const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const expect = chai.expect;


describe('CognitoAddCustomAttributesPlugin', () => {
  let sandbox;
  let mocks;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  
    mocks = {
      './helperMethods': {
        describeStack: sandbox.stub().resolves({})
      }
    }
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('run', () => {
    let CognitoAddCustomAttributesPlugin;
    beforeEach(() => {
      CognitoAddCustomAttributesPlugin = proxyquire.noCallThru()('../index.js', mocks);
    });
    
    it('should call processCognitoCustomAttributeMapping once if custom is object', async () => {
      //Arrange
      const serverlessObject = {
        getProvider: () => {},
        service: {
          custom: {
            CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
            CustomAttributes: [
              {
                AttributeDataType: 'String',
                DeveloperOnlyAttribute: false,
                Mutable: true,
                Name: "another",
                Required: false
              }
            ],
            CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
          }
        }
      };
      const instance = new CognitoAddCustomAttributesPlugin(serverlessObject, {});
      instance.custom = {
        CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
        CustomAttributes: [
          {
            AttributeDataType: 'String',
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Name: "another",
            Required: false
          }
        ],
        CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
      };
      instance.log = console.log;
      instance.processCognitoCustomAttributeMapping = sandbox.stub().resolves({});
      
      //Act
      await instance.run();
      
      //Assert
      expect(instance.processCognitoCustomAttributeMapping.calledOnce).to.be.true;
    });
  
    it('should call processCognitoCustomAttributeMapping once if custom is array with 1 object', async () => {
      //Arrange
      const serverlessObject = {
        getProvider: () => {},
        service: {
          custom: [{
            CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
            CustomAttributes: [
              {
                AttributeDataType: 'String',
                DeveloperOnlyAttribute: false,
                Mutable: true,
                Name: "another",
                Required: false
              }
            ],
            CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
          }]
        }
      };
      const instance = new CognitoAddCustomAttributesPlugin(serverlessObject, {});
      instance.custom = [{
        CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
        CustomAttributes: [
          {
            AttributeDataType: 'String',
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Name: "another",
            Required: false
          }
        ],
        CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
      }];
      instance.log = console.log;
      instance.processCognitoCustomAttributeMapping = sandbox.stub().resolves({});
    
      //Act
      await instance.run();
    
      //Assert
      expect(instance.processCognitoCustomAttributeMapping.calledOnce).to.be.true;
    });
  
    it('should call processCognitoCustomAttributeMapping twice if custom is array with 2 object', async () => {
      //Arrange
      const serverlessObject = {
        getProvider: () => {},
        service: {
          custom: [
            {
              CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
              CustomAttributes: [
                {
                  AttributeDataType: 'String',
                  DeveloperOnlyAttribute: false,
                  Mutable: true,
                  Name: "another",
                  Required: false
                }
              ],
              CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
            },
            {
              CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
              CustomAttributes: [
                {
                  AttributeDataType: 'String',
                  DeveloperOnlyAttribute: false,
                  Mutable: true,
                  Name: "another",
                  Required: false
                }
              ],
              CognitoUserPoolClientIdOutputKey: 'userPoolClient_abafdsfdsa'
            }
          ]
        }
      };
      const instance = new CognitoAddCustomAttributesPlugin(serverlessObject, {});
      instance.custom = [
        {
          CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
          CustomAttributes: [
            {
              AttributeDataType: 'String',
              DeveloperOnlyAttribute: false,
              Mutable: true,
              Name: "another",
              Required: false
            }
          ],
          CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
        },
        {
          CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
          CustomAttributes: [
            {
              AttributeDataType: 'String',
              DeveloperOnlyAttribute: false,
              Mutable: true,
              Name: "another",
              Required: false
            }
          ],
          CognitoUserPoolClientIdOutputKey: 'userPoolClient_abafdsfdsa'
        }
      ];
      instance.log = console.log;
      instance.processCognitoCustomAttributeMapping = sandbox.stub().resolves({});
    
      //Act
      await instance.run();
    
      //Assert
      expect(instance.processCognitoCustomAttributeMapping.callCount).to.be.equal(2);
    });
  
    it('should call processCognitoCustomAttributeMapping once if custom is array with 2 object with empty object ', async () => {
      //Arrange
      const serverlessObject = {
        getProvider: () => {},
        service: {
          custom: [
            {
              CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
              CustomAttributes: [
                {
                  AttributeDataType: 'String',
                  DeveloperOnlyAttribute: false,
                  Mutable: true,
                  Name: "another",
                  Required: false
                }
              ],
              CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
            },
            {
              CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
              CustomAttributes: [
                {
                  AttributeDataType: 'String',
                  DeveloperOnlyAttribute: false,
                  Mutable: true,
                  Name: "another",
                  Required: false
                }
              ],
              CognitoUserPoolClientIdOutputKey: 'userPoolClient_abafdsfdsa'
            }
          ]
        }
      };
      const instance = new CognitoAddCustomAttributesPlugin(serverlessObject, {});
      instance.custom = [
        {
          CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
          CustomAttributes: [
            {
              AttributeDataType: 'String',
              DeveloperOnlyAttribute: false,
              Mutable: true,
              Name: "another",
              Required: false
            }
          ],
          CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
        },
        {}
      ];
      instance.log = console.log;
      instance.processCognitoCustomAttributeMapping = sandbox.stub().resolves({});
    
      //Act
      await instance.run();
    
      //Assert
      expect(instance.processCognitoCustomAttributeMapping.callCount).to.be.equal(1);
    });
  });
});
