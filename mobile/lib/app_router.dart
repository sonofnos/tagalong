import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/activities/activities_list_screen.dart';
import 'features/activities/activity_detail_screen.dart';
import 'features/activities/create_activity_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/signup_screen.dart';
import 'providers/auth_provider.dart';

GoRouter buildRouter(WidgetRef ref, {Listenable? refreshListenable}) {
  return GoRouter(
    initialLocation: '/login',
    refreshListenable: refreshListenable,
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup';

      if (authState is AuthAuthenticated && isAuthRoute) return '/activities';
      if (authState is AuthUnauthenticated && !isAuthRoute) return '/login';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
      GoRoute(path: '/activities', builder: (context, state) => const ActivitiesListScreen()),
      GoRoute(
        path: '/activities/new',
        builder: (context, state) => const CreateActivityScreen(),
      ),
      GoRoute(
        path: '/activities/:id',
        builder: (context, state) =>
            ActivityDetailScreen(activityId: state.pathParameters['id']!),
      ),
    ],
  );
}
