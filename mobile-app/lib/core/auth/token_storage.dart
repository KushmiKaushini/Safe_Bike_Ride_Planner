import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserDisplayName = 'user_display_name';
  static const _keyUserEmail = 'user_email';

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    String? displayName,
    String? email,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
    if (displayName != null) await _storage.write(key: _keyUserDisplayName, value: displayName);
    if (email != null) await _storage.write(key: _keyUserEmail, value: email);
  }

  static Future<String?> getAccessToken() async => await _storage.read(key: _keyAccessToken);
  static Future<String?> getRefreshToken() async => await _storage.read(key: _keyRefreshToken);
  static Future<String?> getUserDisplayName() async => await _storage.read(key: _keyUserDisplayName);
  static Future<String?> getUserEmail() async => await _storage.read(key: _keyUserEmail);

  static Future<void> clearTokens() async {
    await _storage.deleteAll();
  }
}
