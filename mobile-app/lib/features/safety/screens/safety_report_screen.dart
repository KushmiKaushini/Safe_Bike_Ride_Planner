import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/rate_limit_banner.dart';
import '../../../shared/widgets/score_gauge.dart';
import 'home_screen.dart';

class SafetyReportScreen extends ConsumerStatefulWidget {
  const SafetyReportScreen({super.key});

  @override
  ConsumerState<SafetyReportScreen> createState() => _SafetyReportScreenState();
}

class _SafetyReportScreenState extends ConsumerState<SafetyReportScreen> {
  bool _isSaving = false;

  Future<void> _saveReport(Map<String, dynamic> report) async {
    setState(() => _isSaving = true);
    try {
      final dio = ref.read(apiClientProvider);
      final loc = report['location'] ?? {};
      final weather = report['weather'] ?? {};
      final aqi = report['airQuality'] ?? {};

      final res = await dio.post('/api/rides', data: {
        'city': loc['city'] ?? 'Unknown Location',
        'lat': loc['lat'] ?? 0.0,
        'lon': loc['lon'] ?? 0.0,
        'safetyScore': report['safetyScore'] ?? 80,
        'weather': {
          'temp': weather['temp'] ?? 25.0,
          'windSpeed': weather['windSpeed'] ?? 3.0,
          'humidity': weather['humidity'] ?? 60,
          'condition': weather['condition'] ?? 'Clear',
        },
        'airQuality': {
          'aqi': aqi['aqi'] ?? 1,
          'label': aqi['label'] ?? 'Good',
        },
        'recommendation': report['recommendation'] ?? 'safe',
        'summary': report['summary'] ?? 'Good conditions for cycling.',
      });

      if (res.statusCode == 201 || res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Safety check report saved to your history!'),
              backgroundColor: AppTheme.safe,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save report: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final report = ref.watch(currentSafetyReportNotifierProvider);

    if (report == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Safety Assessment')),
        body: const Center(child: Text('No active report available.')),
      );
    }

    final score = report['safetyScore'] as int? ?? 0;
    final level = report['level'] as String? ?? 'Safe';
    final summary = report['summary'] as String? ?? '';
    final loc = report['location'] as Map<String, dynamic>? ?? {};
    final weather = report['weather'] as Map<String, dynamic>? ?? {};
    final aqi = report['airQuality'] as Map<String, dynamic>? ?? {};

    return Scaffold(
      appBar: AppBar(
        title: Text(loc['city'] ?? 'Assessment Report'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: Column(
          children: [
            const RateLimitBanner(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  ScoreGauge(score: score, level: level),
                  const SizedBox(height: 20),
                  Text(
                    summary,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 24),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Weather & Outdoor Metrics',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary),
                          ),
                          const Divider(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _MetricTile(
                                icon: Icons.thermostat_rounded,
                                label: 'Temp',
                                value: '${weather['temp'] ?? '--'}°C',
                              ),
                              _MetricTile(
                                icon: Icons.air_rounded,
                                label: 'Wind',
                                value: '${weather['windSpeed'] ?? '--'} m/s',
                              ),
                              _MetricTile(
                                icon: Icons.water_drop_rounded,
                                label: 'Humidity',
                                value: '${weather['humidity'] ?? '--'}%',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Air Quality Index (European AQI)',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primary),
                          ),
                          const Divider(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Index Level: ${aqi['aqi'] ?? '1'} / 5'),
                              Chip(
                                label: Text(aqi['label'] ?? 'Good'),
                                backgroundColor: AppTheme.safe.withValues(alpha: 0.2),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton.icon(
                    onPressed: _isSaving ? null : () => _saveReport(report),
                    icon: _isSaving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black87),
                          )
                        : const Icon(Icons.bookmark_add_rounded),
                    label: Text(_isSaving ? 'Saving...' : 'Save This Check to History'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _MetricTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFF38BDF8)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF8892B0))),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
