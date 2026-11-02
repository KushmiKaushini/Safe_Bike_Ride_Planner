import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/rate_limit_interceptor.dart';
import '../../core/theme/app_theme.dart';

class RateLimitBanner extends ConsumerStatefulWidget {
  const RateLimitBanner({super.key});

  @override
  ConsumerState<RateLimitBanner> createState() => _RateLimitBannerState();
}

class _RateLimitBannerState extends ConsumerState<RateLimitBanner> {
  Timer? _timer;
  int _secondsRemaining = 0;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown(int seconds) {
    _timer?.cancel();
    setState(() => _secondsRemaining = seconds);

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining <= 1) {
        timer.cancel();
        ref.read(rateLimitSecondsNotifierProvider.notifier).setSeconds(null);
        setState(() => _secondsRemaining = 0);
      } else {
        setState(() => _secondsRemaining -= 1);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final rateLimit = ref.watch(rateLimitSecondsNotifierProvider);

    if (rateLimit != null && rateLimit > 0 && _secondsRemaining == 0) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _startCountdown(rateLimit);
      });
    }

    if (_secondsRemaining <= 0) return const SizedBox.shrink();

    final minutes = (_secondsRemaining ~/ 60).toString().padLeft(2, '0');
    final seconds = (_secondsRemaining % 60).toString().padLeft(2, '0');

    return Container(
      width: double.infinity,
      color: AppTheme.caution.withValues(alpha: 0.9),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          const Icon(Icons.speed, color: Colors.black87),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Too many requests. Actions unlock in $minutes:$seconds',
              style: const TextStyle(
                color: Colors.black87,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
