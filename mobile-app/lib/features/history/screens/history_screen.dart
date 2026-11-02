import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/rate_limit_banner.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final List<dynamic> _rides = [];
  bool _isLoading = true;
  bool _hasMore = false;
  int _skip = 0;
  final int _limit = 20;

  @override
  void initState() {
    super.initState();
    _fetchHistory(reset: true);
  }

  Future<void> _fetchHistory({bool reset = false}) async {
    if (reset) {
      setState(() {
        _isLoading = true;
        _skip = 0;
        _rides.clear();
      });
    }

    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get('/api/rides', queryParameters: {
        'limit': _limit,
        'skip': _skip,
      });

      if (res.statusCode == 200 && res.data['success'] == true) {
        final List<dynamic> newRides = res.data['data'] ?? [];
        final pagination = res.data['pagination'] ?? {};

        setState(() {
          _rides.addAll(newRides);
          _hasMore = pagination['hasMore'] == true;
          _skip += newRides.length;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load ride history: $e')),
        );
      }
    }
  }

  Future<void> _deleteRide(String id, int index) async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.delete('/api/rides/$id');

      if (res.statusCode == 200) {
        setState(() {
          _rides.removeAt(index);
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ride check deleted.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Delete failed: $e')),
        );
      }
    }
  }

  Color _getScoreColor(int score) {
    if (score >= 70) return AppTheme.safe;
    if (score >= 40) return AppTheme.caution;
    return AppTheme.unsafe;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ride Check History'),
        backgroundColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => _fetchHistory(reset: true),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            const RateLimitBanner(),
            Expanded(
              child: _isLoading && _rides.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _rides.isEmpty
                      ? const Center(
                          child: Text(
                            'No saved ride checks yet.\nCheck conditions and tap "Save".',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Color(0xFF8892B0)),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: () => _fetchHistory(reset: true),
                          child: ListView.builder(
                            itemCount: _rides.length + (_hasMore ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (index == _rides.length) {
                                return Center(
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: ElevatedButton(
                                      onPressed: () => _fetchHistory(),
                                      child: const Text('Load More Rides'),
                                    ),
                                  ),
                                );
                              }

                              final ride = _rides[index];
                              final id = ride['_id'] ?? ride['id'];
                              final city = ride['city'] ?? 'Unknown City';
                              final score = (ride['safetyScore'] as num?)?.toInt() ?? 0;
                              final date = ride['createdAt'] != null
                                  ? DateTime.tryParse(ride['createdAt'])?.toLocal().toString().substring(0, 16)
                                  : '';
                              final color = _getScoreColor(score);

                              return Dismissible(
                                key: Key(id),
                                direction: DismissDirection.endToStart,
                                background: Container(
                                  alignment: Alignment.centerRight,
                                  padding: const EdgeInsets.only(right: 20),
                                  color: AppTheme.unsafe,
                                  child: const Icon(Icons.delete_forever_rounded, color: Colors.white),
                                ),
                                onDismissed: (_) => _deleteRide(id, index),
                                child: Card(
                                  child: ListTile(
                                    onTap: () => context.push('/history/$id'),
                                    leading: CircleAvatar(
                                      backgroundColor: color.withValues(alpha: 0.2),
                                      child: Text(
                                        '$score',
                                        style: TextStyle(color: color, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    title: Text(city, style: const TextStyle(fontWeight: FontWeight.bold)),
                                    subtitle: Text(date ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF8892B0))),
                                    trailing: const Icon(Icons.chevron_right_rounded, color: Color(0xFF8892B0)),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
