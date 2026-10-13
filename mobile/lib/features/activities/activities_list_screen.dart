import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../providers/activities_provider.dart';

class ActivitiesListScreen extends ConsumerWidget {
  const ActivitiesListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync = ref.watch(activitiesListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('tagalong'),
        actions: [
          IconButton(
            key: const Key('create_activity_button'),
            icon: const Icon(Icons.add),
            onPressed: () => context.push('/activities/new'),
          ),
        ],
      ),
      body: activitiesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load activities: $err')),
        data: (activities) {
          if (activities.isEmpty) {
            return const Center(child: Text('No activities yet.'));
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(activitiesListProvider),
            child: ListView.builder(
              itemCount: activities.length,
              itemBuilder: (context, index) {
                final activity = activities[index];
                return ListTile(
                  title: Text(activity.title),
                  subtitle: Text(
                    '${activity.location}\n'
                    '${DateFormat.yMMMd().add_jm().format(activity.startsAt)}',
                  ),
                  isThreeLine: true,
                  trailing: Text(
                    activity.spotsLeft > 0 ? '${activity.spotsLeft} left' : 'full',
                  ),
                  onTap: () => context.push('/activities/${activity.id}'),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
