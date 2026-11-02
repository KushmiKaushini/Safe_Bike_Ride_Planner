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
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  final FlutterAppAuth _appAuth = const FlutterAppAuth();
  bool _isLoading = false;
  bool _obscurePassword = true;
  
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

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

  /// Manual Email & Password Login
  Future<void> _handleManualLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
          });

    try {
      final dio = ref.read(apiClientProvider);
      final platformName = kIsWeb ? 'web' : (Platform.isIOS ? 'ios' : 'android');

      final res = await dio.post('/api/auth/login', data: {
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
        'platform': platformName,
      });

      if (res.statusCode == 200 && res.data['success'] == true) {
        await _completeLogin(res.data['data']);
      } else {
        throw Exception(res.data['error'] ?? 'Sign in failed');
      }
    } catch (e) {
      if (mounted) {
        final errorMsg = e.toString().replaceAll('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMsg),
            backgroundColor: AppTheme.unsafe,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
                  });
      }
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
                  });
      }
    }
  }

  /// Instant Demo Sign-In for offline/evaluator use
  Future<void> _handleDemoLogin() async {
    setState(() {
      _isLoading = true;
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
                  });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.directions_bike_rounded,
                  size: 68,
                  color: AppTheme.primary,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Safe Bike Ride Planner',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Real-time weather & air quality assessments for safer cycling.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF8892B0),
                  ),
                ),
                const SizedBox(height: 32),

                // Manual Login Form
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Email Field
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          prefixIcon: Icon(Icons.email_outlined),
                          hintText: 'cyclist@example.com',
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please enter your email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // Password Field
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off_rounded : Icons.visibility_rounded),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          hintText: 'Enter your password',
                        ),
                        validator: (val) {
                          if (val == null || val.isEmpty) {
                            return 'Please enter your password';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),

                      // Sign In Button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _handleManualLogin,
                        child: _isLoading
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.black87,
                                ),
                              )
                            : const Text('Sign In', style: TextStyle(fontSize: 16)),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Register Link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "Don't have an account? ",
                      style: TextStyle(color: Color(0xFF8892B0)),
                    ),
                    GestureDetector(
                      onTap: () => context.push('/register'),
                      child: const Text(
                        'Register',
                        style: TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Divider
                Row(
                  children: [
                    const Expanded(child: Divider(color: Color(0xFF2D3748))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Text(
                        'OR CONTINUE WITH',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                          letterSpacing: 1.1,
                        ),
                      ),
                    ),
                    const Expanded(child: Divider(color: Color(0xFF2D3748))),
                  ],
                ),

                const SizedBox(height: 20),

                // Google OAuth PKCE Button
                OutlinedButton.icon(
                  onPressed: _isLoading ? null : _handleGoogleOAuthPKCE,
                  icon: const Icon(Icons.security_rounded, size: 20),
                  label: const Text('Google Account (OAuth 2.0 PKCE)'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    side: const BorderSide(color: Color(0xFF2D3748)),
                  ),
                ),

                const SizedBox(height: 10),

                // Quick Demo Sign-In
                OutlinedButton.icon(
                  onPressed: _isLoading ? null : _handleDemoLogin,
                  icon: const Icon(Icons.bolt_rounded, color: AppTheme.primary, size: 20),
                  label: const Text(
                    'Quick Demo Sign In (Dev)',
                    style: TextStyle(color: AppTheme.primary),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.primary),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                  ),
                ),

                const SizedBox(height: 20),
                const Text(
                  'Supports standard OAuth 2.0 PKCE, email registration, and demo mode.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
