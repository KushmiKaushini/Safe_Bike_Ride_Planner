import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class Env {
  static String get gatewayBaseUrl {
    const defined = String.fromEnvironment('GATEWAY_BASE_URL');
    if (defined.isNotEmpty) return defined;

    // Web and desktop environments reach backend via localhost/127.0.0.1
    if (kIsWeb || Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
      return 'http://127.0.0.1:8080';
    }

    // Android emulator routes to host machine loopback via 10.0.2.2
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8080';
    }

    return 'http://127.0.0.1:8080';
  }

  static const String oauthClientId = String.fromEnvironment(
    'OAUTH_CLIENT_ID',
    defaultValue: 'your-google-client-id.apps.googleusercontent.com',
  );

  static const String oauthRedirectUri = String.fromEnvironment(
    'OAUTH_REDIRECT_URI',
    defaultValue: 'com.safebike.planner:/oauth2redirect',
  );
}
