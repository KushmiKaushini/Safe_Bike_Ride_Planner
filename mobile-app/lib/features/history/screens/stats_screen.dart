import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class StatsScreen extends ConsumerStatefulWidget {
  const StatsScreen({super.key});

  @override
  ConsumerState<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends ConsumerState<StatsScreen> {
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/rides/stats');
      if (res.statusCode == 200 && res.data['success'] == true) {
        setState(() {
          _stats = res.data['data'];
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
        appBar: AppBar(title: const Text('Cycling Statistics')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final total = _stats?['totalChecks'] ?? 0;
    final avg = _stats?['averageScore'] ?? 0.0;
    final safestCity = _stats?['safestCity'] ?? 'N/A';
    final safestScore = _stats?['safestScore'] ?? 0;
    final dist = _stats?['scoreDistribution'] as Map<String, dynamic>? ?? {};

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cycling Statistics'),
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: 'Total Checks',
                  value: '$total',
                  icon: Icons.checklist_rounded,
                  color: AppTheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  title: 'Average Score',
                  value: '$avg',
                  icon: Icons.speed_rounded,
                  color: const Color(0xFF38BDF8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _StatCard(
            title: 'Safest Destination',
            value: '$safestCity (Score: $safestScore)',
            icon: Icons.star_rounded,
            color: AppTheme.safe,
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Assessment Distribution', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const Divider(height: 24),
                  _DistributionRow(label: 'Safe Conditions (>= 70)', count: dist['safe'] ?? 0, color: AppTheme.safe),
                  const SizedBox(height: 12),
                  _DistributionRow(label: 'Caution Conditions (40-69)', count: dist['caution'] ?? 0, color: AppTheme.caution),
                  const SizedBox(height: 12),
                  _DistributionRow(label: 'Unsafe Conditions (< 40)', count: dist['unsafe'] ?? 0, color: AppTheme.unsafe),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 12, color: Color(0xFF8892B0))),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

class _DistributionRow extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _DistributionRow({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 8),
            Text(label),
          ],
        ),
        Text('$count', style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }
}
