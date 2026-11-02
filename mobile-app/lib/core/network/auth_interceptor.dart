import 'dart:io';
import 'package:dio/dio.dart';
import '../auth/token_storage.dart';
import '../config/env.dart';

class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor(this._dio);
  final Dio _dio;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await TokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['X-Client-Platform'] = Platform.isIOS ? 'ios' : 'android';
    options.headers['Accept'] = 'application/json';
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final is401 = err.response?.statusCode == 401;
    final isRetried = err.requestOptions.extra['retried'] == true;

    if (is401 && !isRetried) {
      final refreshToken = await TokenStorage.getRefreshToken();
      if (refreshToken != null && refreshToken.isNotEmpty) {
        try {
          // Attempt silent token refresh
          final refreshDio = Dio(BaseOptions(baseUrl: Env.gatewayBaseUrl));
          final res = await refreshDio.post('/api/auth/refresh', data: {
            'refreshToken': refreshToken,
          });

          if (res.statusCode == 200 && res.data['success'] == true) {
            final data = res.data['data'];
            final newAccessToken = data['accessToken'] as String;
            final newRefreshToken = data['refreshToken'] as String;

            await TokenStorage.saveTokens(
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            );

            // Replay original request with new access token
            final retryOptions = err.requestOptions;
            retryOptions.extra['retried'] = true;
            retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';

            final response = await _dio.fetch(retryOptions);
            return handler.resolve(response);
          }
        } catch (_) {
          await TokenStorage.clearTokens();
        }
      }
    }
    handler.next(err);
  }
}
