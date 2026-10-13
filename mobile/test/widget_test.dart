import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:tagalong/main.dart';

void main() {
  // No mock handler means flutter_secure_storage's channel call never
  // completes in the test VM, so the app just hangs on AuthLoading.
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (call) async => null,
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  testWidgets('App boots to the login screen when unauthenticated', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: TagalongApp()));

    // Not pumpAndSettle(): the auth-loading state briefly renders a
    // CircularProgressIndicator, which animates indefinitely and would make
    // pumpAndSettle time out waiting for animations to stop.
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    expect(find.text('tagalong'), findsWidgets);
    expect(find.text('Log in'), findsWidgets);
  });

  testWidgets('shows a validation error banner when login fails', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: TagalongApp()));
    for (var i = 0; i < 5; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }

    await tester.enterText(find.byKey(const Key('login_email_field')), 'nope@example.com');
    await tester.enterText(find.byKey(const Key('login_password_field')), 'wrong-password');
    await tester.tap(find.byKey(const Key('login_submit_button')));

    // The real backend isn't reachable from the test VM, so the request
    // fails and the screen should surface an error instead of hanging.
    for (var i = 0; i < 20; i++) {
      await tester.pump(const Duration(milliseconds: 200));
    }

    expect(find.text('Log in'), findsWidgets);
  });
}
