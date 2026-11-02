class Env {
  static const String gatewayBaseUrl = String.fromEnvironment(
    'GATEWAY_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080',
  );

  static const String oauthClientId = String.fromEnvironment(
    'OAUTH_CLIENT_ID',
    defaultValue: 'your-google-client-id.apps.googleusercontent.com',
  );

  static const String oauthRedirectUri = String.fromEnvironment(
    'OAUTH_REDIRECT_URI',
    defaultValue: 'com.safebike.planner:/oauth2redirect',
  );
}
