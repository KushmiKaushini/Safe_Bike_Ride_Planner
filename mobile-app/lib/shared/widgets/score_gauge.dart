import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class ScoreGauge extends StatelessWidget {
  final int score;
  final String level;
  final double size;

  const ScoreGauge({
    super.key,
    required this.score,
    required this.level,
    this.size = 180,
  });

  Color _getScoreColor() {
    if (score >= 70) return AppTheme.safe;
    if (score >= 40) return AppTheme.caution;
    return AppTheme.unsafe;
  }

  @override
  Widget build(BuildContext context) {
    final color = _getScoreColor();

    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: CircularProgressIndicator(
              value: (score.clamp(0, 100)) / 100.0,
              strokeWidth: 12,
              backgroundColor: AppTheme.surfaceContainer,
              valueColor: AlwaysStoppedAnimation<Color>(color),
              strokeCap: StrokeCap.round,
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$score',
                style: TextStyle(
                  fontSize: size * 0.28,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color, width: 1),
                ),
                child: Text(
                  level.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: color,
                    letterSpacing: 1.1,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
