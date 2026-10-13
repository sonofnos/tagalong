import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'app_router.dart';
import 'providers/auth_provider.dart';

void main() {
  runApp(const ProviderScope(child: TagalongApp()));
}

/// go_router only re-runs its `redirect` callback when this notifies, so
/// auth state changes (login/logout) need to be bridged into it explicitly.
class _AuthRefreshNotifier extends ChangeNotifier {
  void refresh() => notifyListeners();
}

class TagalongApp extends ConsumerStatefulWidget {
  const TagalongApp({super.key});

  @override
  ConsumerState<TagalongApp> createState() => _TagalongAppState();
}

class _TagalongAppState extends ConsumerState<TagalongApp> {
  late final _AuthRefreshNotifier _refreshNotifier;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _refreshNotifier = _AuthRefreshNotifier();
    _router = buildRouter(ref, refreshListenable: _refreshNotifier);
  }

  @override
  void dispose() {
    _refreshNotifier.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authProvider, (previous, next) => _refreshNotifier.refresh());

    return MaterialApp.router(
      title: 'tagalong',
      theme: ThemeData(colorSchemeSeed: Colors.teal, useMaterial3: true),
      routerConfig: _router,
    );
  }
}
