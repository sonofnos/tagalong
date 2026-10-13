import 'package:flutter_test/flutter_test.dart';
import 'package:tagalong/models/activity.dart';

void main() {
  group('Activity.fromJson', () {
    test('parses a full row including confirmed_count as a string (postgres count)', () {
      final activity = Activity.fromJson({
        'id': 'a1',
        'title': 'Sunrise hike',
        'description': 'Up Ngong Hills',
        'location': 'Ngong Hills',
        'starts_at': '2026-11-01T06:00:00.000Z',
        'capacity': 5,
        'host_id': 'h1',
        'host_name': 'Amani',
        'confirmed_count': '3',
      });

      expect(activity.capacity, 5);
      expect(activity.spotsLeft, 2);
      expect(activity.hostName, 'Amani');
    });

    test('defaults confirmed_count to 0 when absent', () {
      final activity = Activity.fromJson({
        'id': 'a1',
        'title': 'Pickup game',
        'location': 'Kasarani',
        'starts_at': '2026-11-01T06:00:00.000Z',
        'capacity': 10,
        'host_id': 'h1',
      });

      expect(activity.confirmedCount, 0);
      expect(activity.spotsLeft, 10);
    });

    test('clamps spotsLeft to 0 when overbooked in the source data', () {
      final activity = Activity.fromJson({
        'id': 'a1',
        'title': 'Dinner',
        'location': 'Westlands',
        'starts_at': '2026-11-01T06:00:00.000Z',
        'capacity': 2,
        'host_id': 'h1',
        'confirmed_count': 5,
      });

      expect(activity.spotsLeft, 0);
    });
  });

  group('Rsvp.fromJson', () {
    test('parses status and name', () {
      final rsvp = Rsvp.fromJson({'user_id': 'u1', 'name': 'Beatrice', 'status': 'waitlisted'});
      expect(rsvp.status, 'waitlisted');
      expect(rsvp.name, 'Beatrice');
    });
  });
}
