import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/auth/token_storage.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String _displayName = 'Cyclist';
  String _email = '';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final name = await TokenStorage.getUserDisplayName();
    final email = await TokenStorage.getUserEmail();
    setState(() {
      _displayName = name ?? 'Cyclist';
      _email = email ?? '';
    });
  }

  Future<void> _handleLogout() async {
    final refreshToken = await TokenStorage.getRefreshToken();
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/api/auth/logout', data: {'refreshToken': refreshToken});
    } catch (_) {}

    await TokenStorage.clearTokens();
    if (mounted) context.go('/login');
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account & All Data?'),
        content: const Text(
          'In accordance with GDPR Article 17, this permanently erases your account, ride checks, and active sessions. This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.unsafe),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete Everything'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isLoading = true);
      try {
        final dio = ref.read(apiClientProvider);
        await dio.delete('/api/rides/account');
        await TokenStorage.clearTokens();
        if (mounted) context.go('/login');
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Account deletion failed: $e')),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile & Settings'),
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: CircleAvatar(
              radius: 44,
              backgroundColor: AppTheme.primary.withValues(alpha: 0.2),
              child: const Icon(Icons.person_rounded, size: 48, color: AppTheme.primary),
            ),
          ),
          const SizedBox(height: 16),
          Text(_displayName, textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(_email, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF8892B0))),
          const SizedBox(height: 32),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.tune_rounded, color: AppTheme.primary),
                  title: const Text('Cycling Safety Thresholds'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/thresholds'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.bar_chart_rounded, color: Color(0xFF38BDF8)),
                  title: const Text('Cycling Analytics & Stats'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/stats'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.history_rounded, color: AppTheme.caution),
                  title: const Text('Ride Check History'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/history'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: _isLoading ? null : _handleLogout,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign Out'),
          ),
          const SizedBox(height: 16),
          TextButton.icon(
            onPressed: _isLoading ? null : _deleteAccount,
            icon: const Icon(Icons.delete_forever_rounded, color: AppTheme.unsafe),
            label: const Text('Delete Account & Ride History (GDPR)', style: TextStyle(color: AppTheme.unsafe)),
          ),
        ],
      ),
    );
  }
}
