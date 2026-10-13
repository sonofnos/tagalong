import 'dart:io';

import 'package:dio/dio.dart';

import 'api_exception.dart';
import 'secure_storage.dart';

class ApiClient {
  ApiClient() : _dio = Dio(BaseOptions(baseUrl: _resolveBaseUrl())) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorage.readToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;

  String get baseUrl => _dio.options.baseUrl;

  // 10.0.2.2 is the Android emulator's alias for the host's localhost.
  static String _resolveBaseUrl() {
    const envUrl = String.fromEnvironment('TAGALONG_API_BASE_URL');
    if (envUrl.isNotEmpty) return envUrl;

    if (!Platform.isAndroid) return 'http://127.0.0.1:4000';
    return 'http://10.0.2.2:4000';
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    return _unwrap(await _guard(() => _dio.get(path, queryParameters: query)));
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    return _unwrap(await _guard(() => _dio.post(path, data: body)));
  }

  Future<Response> _guard(Future<Response> Function() call) async {
    try {
      return await call();
    } on DioException catch (e) {
      final data = e.response?.data;
      final message = data is Map && data['error'] is String
          ? data['error'] as String
          : 'Something went wrong. Please try again.';
      throw ApiException(message: message, statusCode: e.response?.statusCode);
    }
  }

  dynamic _unwrap(Response response) {
    return response.data;
  }
}
