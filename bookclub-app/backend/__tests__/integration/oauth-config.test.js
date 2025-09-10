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
      expect(yamlContent).toContain('client_id: ${ssm:/bookclub/oauth/google_client_id}');
      expect(yamlContent).toContain('client_secret: ${ssm:/bookclub/oauth/google_client_secret}');
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

  describe('User Pool Client', () => {
    test('should support Google as identity provider', () => {
      expect(yamlContent).toContain('SupportedIdentityProviders:');
      expect(yamlContent).toContain('- COGNITO');
      expect(yamlContent).toContain('- Google');
    });

    test('should depend on Google Identity Provider', () => {
      expect(yamlContent).toContain('DependsOn: GoogleIdentityProvider');
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