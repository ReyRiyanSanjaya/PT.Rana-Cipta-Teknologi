## Flutter/Dart baseline
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class io.flutter.app.** { *; }
-dontwarn io.flutter.**

## Kotlin coroutines and stdlib
-dontwarn kotlinx.**
-dontwarn kotlin.**

## OkHttp/Okio/Dio
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

## Gson / JSON adapters (if used via Dio)
-dontwarn com.google.gson.**
-keep class com.google.gson.** { *; }

## WorkManager
-keep class androidx.work.** { *; }
-dontwarn androidx.work.**

## Local notifications
-keep class com.dexterous.** { *; }
-dontwarn com.dexterous.**

## Permissions
-keep class com.baseflow.permissionhandler.** { *; }
-dontwarn com.baseflow.permissionhandler.**

## Mobile scanner / Camera
-dontwarn com.google.mlkit.**
-dontwarn com.journeyapps.**
-dontwarn com.google.zxing.**
-keep class com.google.mlkit.** { *; }
-keep class com.google.zxing.** { *; }

## Blue Thermal Printer
-dontwarn com.zkteco.android.**
-dontwarn cz.** 

## Image picker
-dontwarn io.github.** 

## Prevent model obfuscation for reflection-based frameworks
-keep class **.R
-keep class **.R$* { *; }

## Keep Application class and activities
-keep class **.MainActivity { *; }
-keep class **.Application { *; }

