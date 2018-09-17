const chai = require('chai');
const loadCustom = require('../helperMethods').loadCustom;

const expect = chai.expect;

describe('loadCustom', () => {

  it('should return empty array if CognitoAddCustomAttributes attribute is blank', () => {
    
    //Act
    const result = loadCustom(() => {}, null);
    
    //Assert
    expect(result).to.be.deep.equal([]);
  });
  
  it('should return array with 1 entry if object is passed in', () => {
    //Arrange
    const custom = {
      CognitoAddCustomAttributes: {
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
    };
    
    //Act
    const result = loadCustom(() => {}, custom);
    
    //Assert
    expect(result).to.be.deep.equal([
      {
        CognitoUserPoolIdOutputKey: 'userPoolId_12312321321',
        CustomAttributes: [
          {
            'AttributeDataType': 'String',
            DeveloperOnlyAttribute: false,
            Mutable: true,
            Name: "another",
            Required: false
          }
        ],
        CognitoUserPoolClientIdOutputKey: 'userPoolClient_12312321312'
      }
    ]);
  });
  
  it('should return array with 1 entry if an array with one object is passed in', () => {
    //Arrange
    const custom = {
      CognitoAddCustomAttributes: [{
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
    };
    
    //Act
    const result = loadCustom(() => {}, custom);
    
    //Assert
    expect(result).to.be.deep.equal([
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
      }
    ]);
  });
  
  it('should return array with 2 entries if an array with two objects is passed in', () => {
    //Arrange
    const custom = {
      CognitoAddCustomAttributes: [
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
          CognitoUserPoolClientIdOutputKey: 'userPoolClient_abcdsfadf'
        }
      ]
    };
    
    //Act
    const result = loadCustom(() => {}, custom);
    
    //Assert
    expect(result).to.be.deep.equal([
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
        CognitoUserPoolClientIdOutputKey: 'userPoolClient_abcdsfadf'
      }
    ]);
  });
});
