import 'package:socket_io_client/socket_io_client.dart' as socket_io;

/// Thin wrapper around the socket.io client so the activity detail screen
/// can watch one activity's attendee updates without reaching into the
/// socket.io API directly.
class RealtimeClient {
  RealtimeClient(String baseUrl)
      : _socket = socket_io.io(
          baseUrl,
          socket_io.OptionBuilder().setTransports(['websocket']).disableAutoConnect().build(),
        );

  final socket_io.Socket _socket;

  void connect() {
    if (!_socket.connected) _socket.connect();
  }

  void watchActivity(String activityId) {
    _socket.emit('watch_activity', activityId);
  }

  void unwatchActivity(String activityId) {
    _socket.emit('unwatch_activity', activityId);
  }

  void onAttendeeUpdate(void Function(Map<String, dynamic> event) callback) {
    _socket.on('attendee_update', (data) {
      if (data is Map) {
        callback(Map<String, dynamic>.from(data));
      }
    });
  }

  void dispose() {
    _socket.dispose();
  }
}
