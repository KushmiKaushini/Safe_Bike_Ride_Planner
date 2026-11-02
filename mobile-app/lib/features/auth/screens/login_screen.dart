import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/token_storage.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final FlutterAppAuth _appAuth = const FlutterAppAuth();
  bool _isLoading = false;
  String? _loadingMessage;

  Future<void> _completeLogin(Map<String, dynamic> data) async {
    await TokenStorage.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
      displayName: data['user']['displayName'],
      email: data['user']['email'],
    );

    if (mounted) {
      context.go('/home');
    }
  }

  /// Full OAuth 2.0 PKCE flow via flutter_appauth (RFC 8252 / RFC 7636)
  Future<void> _handleGoogleOAuthPKCE() async {
    if (kIsWeb || (!Platform.isAndroid && !Platform.isIOS)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Custom Tabs OAuth is only supported on Android/iOS. Please use Quick Demo Sign In on desktop.'),
          ),
        );
      }
      return;
    }

    // Check if OAuth Client ID is placeholder
    if (Env.oauthClientId.contains('your-google-client-id')) {
      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.surface,
          title: const Text('Google OAuth Configuration'),
          content: const Text(
            'The app is currently using the default Google Client ID placeholder. '
            'Google OAuth requires registering your SHA-1 fingerprint in Google Cloud Console.\n\n'
            'You can continue with the browser flow or switch to Quick Demo Sign In.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop(false);
                _handleDemoLogin();
              },
              child: const Text('Use Quick Demo'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Try OAuth Flow'),
            ),
          ],
        ),
      );

      if (proceed != true) return;
    }

    setState(() {
      _isLoading = true;
      _loadingMessage = 'Launching Google Sign-In...';
    });

    try {
      final AuthorizationTokenResponse result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          Env.oauthClientId,
          Env.oauthRedirectUri,
          issuer: 'https://accounts.google.com',
          scopes: <String>['openid', 'profile', 'email'],
          promptValues: <String>['select_account'],
        ),
      );

      if (result.idToken == null) {
        throw Exception('Sign-in completed but no id_token was returned.');
      }

      setState(() => _loadingMessage = 'Verifying token with Gateway...');

      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/api/auth/mobile/token', data: {
        'idToken': result.idToken,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });

      if (res.statusCode == 200 && res.data['success'] == true) {
        await _completeLogin(res.data['data']);
      } else {
        throw Exception(res.data['error'] ?? 'Token exchange rejected');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('OAuth Error: $e'),
            backgroundColor: AppTheme.unsafe,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingMessage = null;
        });
      }
    }
  }

  /// Instant Demo Sign-In for offline/evaluator use
  Future<void> _handleDemoLogin() async {
    setState(() {
      _isLoading = true;
      _loadingMessage = 'Authenticating demo cyclist...';
    });

    try {
      final dio = ref.read(apiClientProvider);
      final platformName = kIsWeb ? 'web' : (Platform.isIOS ? 'ios' : 'android');

      final res = await dio.post('/api/auth/mobile/token', data: {
        'idToken': 'mock_google_id_token_${DateTime.now().millisecondsSinceEpoch}',
        'platform': platformName,
      });

      if (res.statusCode == 200 && res.data['success'] == true) {
        await _completeLogin(res.data['data']);
      } else {
        throw Exception(res.data['error'] ?? 'Authentication failed');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Demo Login failed: $e'),
            backgroundColor: AppTheme.unsafe,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadingMessage = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(
                Icons.directions_bike_rounded,
                size: 80,
                color: AppTheme.primary,
              ),
              const SizedBox(height: 16),
              const Text(
                'Safe Bike Ride Planner',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Real-time weather & air quality assessments for safer cycling.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF8892B0),
                ),
              ),
              const SizedBox(height: 48),

              // Real Google OAuth 2.0 PKCE Button
              ElevatedButton.icon(
                onPressed: _isLoading ? null : _handleGoogleOAuthPKCE,
                icon: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black87),
                      )
                    : const Icon(Icons.security_rounded),
                label: Text(_isLoading ? (_loadingMessage ?? 'Authenticating...') : 'Sign in with Google (OAuth 2.0 PKCE)'),
              ),

              const SizedBox(height: 12),

              // Quick Demo Sign-In Button
              OutlinedButton.icon(
                onPressed: _isLoading ? null : _handleDemoLogin,
                icon: const Icon(Icons.bolt_rounded, color: AppTheme.primary),
                label: const Text(
                  'Quick Demo Sign In (Dev)',
                  style: TextStyle(color: AppTheme.primary),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.primary),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),

              const SizedBox(height: 24),
              const Text(
                'OAuth 2.0 PKCE adheres to RFC 8252 for native mobile apps.\nDemo mode issues real JWT tokens locally.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
