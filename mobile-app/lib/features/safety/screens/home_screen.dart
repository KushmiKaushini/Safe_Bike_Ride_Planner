import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/token_storage.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/rate_limit_banner.dart';

final currentSafetyReportNotifierProvider =
    NotifierProvider<CurrentSafetyReportNotifier, Map<String, dynamic>?>(
        CurrentSafetyReportNotifier.new);

class CurrentSafetyReportNotifier extends Notifier<Map<String, dynamic>?> {
  @override
  Map<String, dynamic>? build() => null;

  void setReport(Map<String, dynamic>? report) {
    state = report;
  }
}

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _cityController = TextEditingController();
  bool _isLoading = false;
  String _displayName = 'Cyclist';

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final name = await TokenStorage.getUserDisplayName();
    if (name != null && mounted) {
      setState(() => _displayName = name);
    }
  }

  Future<void> _fetchConditions(double lat, double lon) async {
    setState(() => _isLoading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/safety/conditions', queryParameters: {
        'lat': lat,
        'lon': lon,
      });

      if (res.statusCode == 200 && res.data['success'] == true) {
        ref.read(currentSafetyReportNotifierProvider.notifier).setReport(res.data['data']);
        if (mounted) {
          context.push('/report');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to evaluate conditions: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleCitySearch() async {
    final city = _cityController.text.trim();
    if (city.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/safety/geocode', queryParameters: {'city': city});

      if (res.statusCode == 200 && res.data['success'] == true) {
        final loc = res.data['data'];
        await _fetchConditions((loc['lat'] as num).toDouble(), (loc['lon'] as num).toDouble());
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('City search error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _detectLocation() async {
    setState(() => _isLoading = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.deniedForever || permission == LocationPermission.denied) {
        await _fetchConditions(6.9271, 79.8612);
        return;
      }

      final pos = await Geolocator.getCurrentPosition();
      await _fetchConditions(pos.latitude, pos.longitude);
    } catch (_) {
      await _fetchConditions(6.9271, 79.8612);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, $_displayName'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Threshold Settings',
            onPressed: () => context.push('/thresholds'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async {
              await TokenStorage.clearTokens();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            const RateLimitBanner(),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Icon(
                      Icons.directions_bike_rounded,
                      size: 64,
                      color: AppTheme.primary,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Check Outdoor Cycling Conditions',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Search by city name or use your current GPS location to get real-time safety scores.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF8892B0)),
                    ),
                    const SizedBox(height: 32),
                    TextField(
                      controller: _cityController,
                      decoration: InputDecoration(
                        hintText: 'Enter city (e.g. Colombo, Kandy)',
                        prefixIcon: const Icon(Icons.search_rounded),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.arrow_forward_rounded),
                          onPressed: _isLoading ? null : _handleCitySearch,
                        ),
                      ),
                      onSubmitted: (_) => _handleCitySearch(),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _isLoading ? null : _detectLocation,
                      icon: const Icon(Icons.my_location_rounded),
                      label: Text(_isLoading ? 'Detecting Location...' : 'Use My Current Location'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
