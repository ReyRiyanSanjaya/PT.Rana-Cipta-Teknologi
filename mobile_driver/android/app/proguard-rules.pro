# Flutter
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Dio / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Socket.IO
-keep class io.socket.** { *; }

# Google Fonts
-keep class com.google.android.gms.** { *; }

# Geolocator
-keep class com.baseflow.geolocator.** { *; }

# Camera
-keep class io.flutter.plugins.camera.** { *; }

# Sensors
-keep class dev.fluttercommunity.plus.sensors.** { *; }

# Keep annotations
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
