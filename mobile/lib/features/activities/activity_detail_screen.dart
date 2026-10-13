import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_exception.dart';
import '../../core/realtime_client.dart';
import '../../providers/activities_provider.dart';
import '../../providers/api_provider.dart';
import '../../widgets/error_banner.dart';

class ActivityDetailScreen extends ConsumerStatefulWidget {
  final String activityId;

  const ActivityDetailScreen({super.key, required this.activityId});

  @override
  ConsumerState<ActivityDetailScreen> createState() => _ActivityDetailScreenState();
}

class _ActivityDetailScreenState extends ConsumerState<ActivityDetailScreen> {
  RealtimeClient? _realtime;
  String? _myStatus;
  String? _error;
  String? _inviteCode;

  @override
  void initState() {
    super.initState();
    final baseUrl = ref.read(apiClientProvider).baseUrl;
    _realtime = RealtimeClient(baseUrl)
      ..connect()
      ..watchActivity(widget.activityId)
      ..onAttendeeUpdate((event) {
        if (event['activityId'] == widget.activityId) {
          ref.invalidate(activityDetailProvider(widget.activityId));
        }
      });
  }

  @override
  void dispose() {
    _realtime?.unwatchActivity(widget.activityId);
    _realtime?.dispose();
    super.dispose();
  }

  Future<void> _rsvp() async {
    setState(() => _error = null);
    try {
      final status = await rsvpToActivity(ref, widget.activityId);
      setState(() => _myStatus = status);
      ref.invalidate(activityDetailProvider(widget.activityId));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  Future<void> _invite() async {
    try {
      final code = await createInvite(ref, widget.activityId);
      setState(() => _inviteCode = code);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(activityDetailProvider(widget.activityId));

    return Scaffold(
      appBar: AppBar(title: const Text('Activity')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load: $err')),
        data: (detail) {
          final activity = detail.activity;
          final confirmed = detail.rsvps.where((r) => r.status == 'confirmed').toList();
          final waitlisted = detail.rsvps.where((r) => r.status == 'waitlisted').toList();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_error != null) ErrorBanner(message: _error!),
                Text(activity.title, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 4),
                Text(activity.description),
                const SizedBox(height: 8),
                Text(activity.location),
                Text(activity.startsAt.toString()),
                Text('hosted by ${activity.hostName}'),
                const SizedBox(height: 16),
                FilledButton(
                  key: const Key('rsvp_button'),
                  onPressed: _rsvp,
                  child: const Text("I'm in"),
                ),
                if (_myStatus != null) Text('You are $_myStatus.'),
                const SizedBox(height: 16),
                Text(
                  'Going (${confirmed.length}/${activity.capacity})',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                for (final r in confirmed) Text(r.name),
                if (waitlisted.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text('Waitlist (${waitlisted.length})', style: Theme.of(context).textTheme.titleMedium),
                  for (final r in waitlisted) Text(r.name),
                ],
                const SizedBox(height: 16),
                OutlinedButton(onPressed: _invite, child: const Text('Invite a friend')),
                if (_inviteCode != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text('Invite code: $_inviteCode', key: const Key('invite_code_text')),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
