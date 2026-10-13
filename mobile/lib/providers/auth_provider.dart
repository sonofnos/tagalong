import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/secure_storage.dart';
import '../models/user.dart';
import 'api_provider.dart';

sealed class AuthState {
  const AuthState();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

class AuthAuthenticated extends AuthState {
  final AppUser user;
  const AuthAuthenticated(this.user);
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _restoreSession();
    return const AuthLoading();
  }

  Future<void> _restoreSession() async {
    final token = await SecureStorage.readToken();
    final cachedUser = await SecureStorage.readUser();
    if (token == null || cachedUser == null) {
      state = const AuthUnauthenticated();
      return;
    }
    state = AuthAuthenticated(AppUser.fromJson(cachedUser));
  }

  Future<void> login(String email, String password) async {
    final api = ref.read(apiClientProvider);
    final response = await api.post('/auth/login', body: {'email': email, 'password': password});
    await _persistSession(response as Map<String, dynamic>);
  }

  Future<void> signup(String name, String email, String password) async {
    final api = ref.read(apiClientProvider);
    final response = await api.post(
      '/auth/signup',
      body: {'name': name, 'email': email, 'password': password},
    );
    await _persistSession(response as Map<String, dynamic>);
  }

  Future<void> _persistSession(Map<String, dynamic> response) async {
    await SecureStorage.saveToken(response['token'] as String);
    final userJson = response['user'] as Map<String, dynamic>;
    await SecureStorage.saveUser(userJson);
    state = AuthAuthenticated(AppUser.fromJson(userJson));
  }

  Future<void> logout() async {
    await SecureStorage.clearAll();
    state = const AuthUnauthenticated();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
