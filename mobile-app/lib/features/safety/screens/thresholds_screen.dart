import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ThresholdsScreen extends ConsumerStatefulWidget {
  const ThresholdsScreen({super.key});

  @override
  ConsumerState<ThresholdsScreen> createState() => _ThresholdsScreenState();
}

class _ThresholdsScreenState extends ConsumerState<ThresholdsScreen> {
  double _maxWind = 8.0;
  double _minTemp = 10.0;
  double _maxTemp = 35.0;
  int _maxAqi = 2;
  String _profile = 'beginner';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadThresholds();
  }

  Future<void> _loadThresholds() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/safety/thresholds');
      if (res.statusCode == 200 && res.data['success'] == true) {
        final data = res.data['data'];
        setState(() {
          _profile = data['profile'] ?? 'beginner';
          _maxWind = (data['maxWindSpeedMs'] as num).toDouble();
          _minTemp = (data['minTempC'] as num).toDouble();
          _maxTemp = (data['maxTempC'] as num).toDouble();
          _maxAqi = data['maxAqi'] ?? 2;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveThresholds() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.put('/api/safety/thresholds', data: {
        'profile': _profile,
        'maxWindSpeedMs': _maxWind,
        'minTempC': _minTemp,
        'maxTempC': _maxTemp,
        'maxAqi': _maxAqi,
      });

      if (res.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Rider threshold preferences updated!'),
            backgroundColor: AppTheme.safe,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update thresholds: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Rider Thresholds')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Rider Threshold Settings')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Personal Cycling Safety Limits',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Adjust your tolerance thresholds. If outdoor conditions exceed these limits, safety scores apply tailored penalties.',
            style: TextStyle(color: Color(0xFF8892B0)),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Max Wind Speed: ${_maxWind.toStringAsFixed(1)} m/s'),
                  Slider(
                    value: _maxWind,
                    min: 3.0,
                    max: 18.0,
                    divisions: 15,
                    activeColor: AppTheme.primary,
                    onChanged: (v) => setState(() => _maxWind = v),
                  ),
                  const Divider(height: 32),
                  Text('Comfort Temperature Range: ${_minTemp.toInt()}°C - ${_maxTemp.toInt()}°C'),
                  RangeSlider(
                    values: RangeValues(_minTemp, _maxTemp),
                    min: 0,
                    max: 45,
                    divisions: 45,
                    activeColor: AppTheme.primary,
                    onChanged: (values) {
                      setState(() {
                        _minTemp = values.start;
                        _maxTemp = values.end;
                      });
                    },
                  ),
                  const Divider(height: 32),
                  Text('Maximum Acceptable European AQI: Level $_maxAqi / 5'),
                  Slider(
                    value: _maxAqi.toDouble(),
                    min: 1,
                    max: 5,
                    divisions: 4,
                    activeColor: AppTheme.primary,
                    onChanged: (v) => setState(() => _maxAqi = v.toInt()),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: _saveThresholds,
            child: const Text('Save Threshold Preferences'),
          ),
        ],
      ),
    );
  }
}
