import 'package:flutter/material.dart';
import 'package:flutter_mapbox_navigation/flutter_mapbox_navigation.dart';
import 'package:latlong2/latlong.dart';

class NavigationScreen extends StatefulWidget {
  final LatLng origin;
  final LatLng destination;

  const NavigationScreen({super.key, required this.origin, required this.destination});

  @override
  State<NavigationScreen> createState() => _NavigationScreenState();
}

class _NavigationScreenState extends State<NavigationScreen> {
  late MapBoxNavigation _directions;

  @override
  void initState() {
    super.initState();
    _directions = MapBoxNavigation();
    _startNavigation();
  }

  Future<void> _startNavigation() async {
    final wayPoints = <WayPoint>[
      WayPoint(name: "Origin", latitude: widget.origin.latitude, longitude: widget.origin.longitude),
      WayPoint(name: "Destination", latitude: widget.destination.latitude, longitude: widget.destination.longitude),
    ];

    await _directions.startNavigation(
      wayPoints: wayPoints,
      options: MapBoxOptions(
        mode: MapBoxNavigationMode.drivingWithTraffic,
        simulateRoute: true,
        language: "id",
        units: VoiceUnits.metric,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
