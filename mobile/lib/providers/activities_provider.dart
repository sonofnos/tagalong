import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/activity.dart';
import 'api_provider.dart';

final activitiesListProvider = FutureProvider.autoDispose<List<Activity>>((ref) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get('/activities') as Map<String, dynamic>;
  final rows = (response['activities'] as List).cast<Map<String, dynamic>>();
  return rows.map(Activity.fromJson).toList();
});

class ActivityDetail {
  final Activity activity;
  final List<Rsvp> rsvps;

  const ActivityDetail({required this.activity, required this.rsvps});
}

final activityDetailProvider =
    FutureProvider.autoDispose.family<ActivityDetail, String>((ref, activityId) async {
  final api = ref.read(apiClientProvider);
  final response = await api.get('/activities/$activityId') as Map<String, dynamic>;
  final activityJson = response['activity'] as Map<String, dynamic>;
  final rsvpRows = (response['rsvps'] as List).cast<Map<String, dynamic>>();
  return ActivityDetail(
    activity: Activity.fromJson(activityJson),
    rsvps: rsvpRows.map(Rsvp.fromJson).toList(),
  );
});

Future<String> rsvpToActivity(WidgetRef ref, String activityId) async {
  final api = ref.read(apiClientProvider);
  final response = await api.post('/activities/$activityId/rsvp') as Map<String, dynamic>;
  return response['status'] as String;
}

Future<Map<String, dynamic>> createActivity(
  WidgetRef ref, {
  required String title,
  required String description,
  required String location,
  required DateTime startsAt,
  required int capacity,
}) async {
  final api = ref.read(apiClientProvider);
  final response = await api.post(
    '/activities',
    body: {
      'title': title,
      'description': description,
      'location': location,
      'startsAt': startsAt.toIso8601String(),
      'capacity': capacity,
    },
  ) as Map<String, dynamic>;
  return response['activity'] as Map<String, dynamic>;
}

Future<String> createInvite(WidgetRef ref, String activityId) async {
  final api = ref.read(apiClientProvider);
  final response = await api.post('/activities/$activityId/invites') as Map<String, dynamic>;
  return (response['invite'] as Map<String, dynamic>)['code'] as String;
}
