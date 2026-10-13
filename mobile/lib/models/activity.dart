class Activity {
  final String id;
  final String title;
  final String description;
  final String location;
  final DateTime startsAt;
  final int capacity;
  final String hostId;
  final String hostName;
  final int confirmedCount;

  const Activity({
    required this.id,
    required this.title,
    required this.description,
    required this.location,
    required this.startsAt,
    required this.capacity,
    required this.hostId,
    required this.hostName,
    required this.confirmedCount,
  });

  factory Activity.fromJson(Map<String, dynamic> json) {
    return Activity(
      id: json['id'] as String,
      title: json['title'] as String,
      description: (json['description'] as String?) ?? '',
      location: json['location'] as String,
      startsAt: DateTime.parse(json['starts_at'] as String),
      capacity: (json['capacity'] as num).toInt(),
      hostId: json['host_id'] as String,
      hostName: (json['host_name'] as String?) ?? '',
      confirmedCount: json['confirmed_count'] == null
          ? 0
          : (num.parse(json['confirmed_count'].toString())).toInt(),
    );
  }

  int get spotsLeft => (capacity - confirmedCount).clamp(0, capacity);
}

class Rsvp {
  final String userId;
  final String name;
  final String status;

  const Rsvp({required this.userId, required this.name, required this.status});

  factory Rsvp.fromJson(Map<String, dynamic> json) {
    return Rsvp(
      userId: json['user_id'] as String,
      name: json['name'] as String,
      status: json['status'] as String,
    );
  }
}
