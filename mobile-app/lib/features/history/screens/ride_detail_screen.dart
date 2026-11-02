import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/score_gauge.dart';

class RideDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const RideDetailScreen({super.key, required this.id});

  @override
  ConsumerState<RideDetailScreen> createState() => _RideDetailScreenState();
}

class _RideDetailScreenState extends ConsumerState<RideDetailScreen> {
  Map<String, dynamic>? _ride;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/rides/${widget.id}');
      if (res.statusCode == 200 && res.data['success'] == true) {
        setState(() {
          _ride = res.data['data'];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ride Check Detail')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_ride == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ride Check Detail')),
        body: const Center(child: Text('Ride details not found.')),
      );
    }

    final city = _ride!['city'] ?? 'Unknown Location';
    final score = (_ride!['safetyScore'] as num?)?.toInt() ?? 0;
    final level = _ride!['recommendation'] ?? 'safe';
    final summary = _ride!['summary'] ?? '';
    final weather = _ride!['weather'] as Map<String, dynamic>? ?? {};
    final aqi = _ride!['airQuality'] as Map<String, dynamic>? ?? {};
    final date = _ride!['createdAt'] != null
        ? DateTime.tryParse(_ride!['createdAt'])?.toLocal().toString().substring(0, 16)
        : '';

    return Scaffold(
      appBar: AppBar(
        title: Text(city),
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          ScoreGauge(score: score, level: level),
          const SizedBox(height: 16),
          Text(
            summary,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          Text(
            'Recorded: $date',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Color(0xFF8892B0)),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Recorded Weather Conditions', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary)),
                  const Divider(height: 24),
                  Text('Temperature: ${weather['temp'] ?? '--'}°C'),
                  const SizedBox(height: 8),
                  Text('Wind Speed: ${weather['windSpeed'] ?? '--'} m/s'),
                  const SizedBox(height: 8),
                  Text('Humidity: ${weather['humidity'] ?? '--'}%'),
                  const SizedBox(height: 8),
                  Text('Condition: ${weather['condition'] ?? 'Clear'}'),
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
                  const Text('Air Quality Readings', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary)),
                  const Divider(height: 24),
                  Text('European AQI Level: ${aqi['aqi'] ?? '1'} / 5 (${aqi['label'] ?? 'Good'})'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
