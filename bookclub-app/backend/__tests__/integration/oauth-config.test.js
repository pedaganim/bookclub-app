const fs = require('fs');
const path = require('path');

describe('OAuth Configuration', () => {
  let yamlContent;

  beforeAll(() => {
    const serverlessPath = path.join(__dirname, '../../serverless.yml');
    yamlContent = fs.readFileSync(serverlessPath, 'utf8');
  });

  describe('Google Identity Provider', () => {
    test('should have Google Identity Provider configured', () => {
      expect(yamlContent).toContain('GoogleIdentityProvider:');
      expect(yamlContent).toContain('Type: AWS::CloudFormation::CustomResource');
      expect(yamlContent).toContain('ProviderName: Google');
      expect(yamlContent).toContain('ProviderType: Google');
    });

    test('should have correct provider details', () => {
      expect(yamlContent).toContain("client_id: ${env:GOOGLE_CLIENT_ID, ''}");
      expect(yamlContent).toContain("client_secret: ${env:GOOGLE_CLIENT_SECRET, ''}");
      expect(yamlContent).toContain('authorize_scopes: "openid email profile"');
    });

    test('should have correct attribute mapping', () => {
      expect(yamlContent).toContain('AttributeMapping:');
      expect(yamlContent).toContain('email: email');
      expect(yamlContent).toContain('given_name: given_name');
      expect(yamlContent).toContain('family_name: family_name');
      expect(yamlContent).toContain('name: name');
    });
  });

  describe('Facebook Identity Provider', () => {
    test('should have Facebook Identity Provider configured', () => {
      expect(yamlContent).toContain('FacebookIdentityProvider:');
      expect(yamlContent).toContain('Type: AWS::CloudFormation::CustomResource');
      expect(yamlContent).toContain('ProviderName: Facebook');
      expect(yamlContent).toContain('ProviderType: Facebook');
    });

    test('should have correct provider details', () => {
      expect(yamlContent).toContain("client_id: ${env:FACEBOOK_CLIENT_ID, ''}");
      expect(yamlContent).toContain("client_secret: ${env:FACEBOOK_CLIENT_SECRET, ''}");
      expect(yamlContent).toContain('authorize_scopes: "email,public_profile"');
    });

    test('should have correct attribute mapping', () => {
      expect(yamlContent).toContain('username: id');
    });
  });

  describe('Custom Triggers for Passwordless SMS OTP', () => {
    test('should have custom triggers attached to UserPool', () => {
      expect(yamlContent).toContain('DefineAuthChallenge: !GetAtt DefineAuthChallengeLambdaFunction.Arn');
      expect(yamlContent).toContain('CreateAuthChallenge: !GetAtt CreateAuthChallengeLambdaFunction.Arn');
      expect(yamlContent).toContain('VerifyAuthChallengeResponse: !GetAtt VerifyAuthChallengeResponseLambdaFunction.Arn');
      expect(yamlContent).toContain('PreSignUp: !GetAtt PreSignUpLambdaFunction.Arn');
    });
  });

  describe('User Pool Client', () => {
    test('should support Google, Facebook, and COGNITO as identity providers', () => {
      expect(yamlContent).toContain('SupportedIdentityProviders:');
      expect(yamlContent).toContain('- Google');
      expect(yamlContent).toContain('- Facebook');
      expect(yamlContent).toContain('- COGNITO');
    });

    test('should support CUSTOM_AUTH flow', () => {
      expect(yamlContent).toContain('- ALLOW_CUSTOM_AUTH');
    });

    test('should have OAuth flows configured', () => {
      expect(yamlContent).toContain('AllowedOAuthFlowsUserPoolClient: true');
      expect(yamlContent).toContain('AllowedOAuthFlows:');
      expect(yamlContent).toContain('- code');
      expect(yamlContent).toContain('AllowedOAuthScopes:');
      expect(yamlContent).toContain('- openid');
      expect(yamlContent).toContain('- email');
      expect(yamlContent).toContain('- profile');
    });
  });
});