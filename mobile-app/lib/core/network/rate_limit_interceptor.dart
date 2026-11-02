import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final rateLimitSecondsNotifierProvider = NotifierProvider<RateLimitNotifier, int?>(RateLimitNotifier.new);

class RateLimitNotifier extends Notifier<int?> {
  @override
  int? build() => null;

  void setSeconds(int? seconds) {
    state = seconds;
  }
}

class RateLimitInterceptor extends Interceptor {
  RateLimitInterceptor(this._ref);
  final Ref _ref;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 429) {
      final retryAfterHeader = err.response?.headers.value('retry-after');
      final body = err.response?.data;

      int seconds = 60;
      if (retryAfterHeader != null) {
        seconds = int.tryParse(retryAfterHeader) ?? 60;
      } else if (body is Map && body['retryAfter'] != null) {
        seconds = body['retryAfter'] as int;
      }

      // Broadcast to UI layer via Notifier
      _ref.read(rateLimitSecondsNotifierProvider.notifier).setSeconds(seconds);
    }
    handler.next(err);
  }
}
