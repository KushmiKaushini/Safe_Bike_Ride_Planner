import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:safe_bike_planner/shared/widgets/score_gauge.dart';

void main() {
  testWidgets('ScoreGauge displays score and level badge correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ScoreGauge(score: 85, level: 'Safe'),
        ),
      ),
    );

    expect(find.text('85'), findsOneWidget);
    expect(find.text('SAFE'), findsOneWidget);
  });
}
