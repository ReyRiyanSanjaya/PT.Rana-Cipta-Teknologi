import com.android.build.gradle.BaseExtension
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import org.jetbrains.kotlin.gradle.tasks.KotlinJvmCompile
import org.gradle.api.tasks.compile.JavaCompile

allprojects {
    repositories {
        google()
        mavenCentral()
    }
    tasks.withType<JavaCompile>().configureEach {
        sourceCompatibility = "1.8"
        targetCompatibility = "1.8"
    }
    tasks.withType<KotlinCompile>().configureEach {
        kotlinOptions {
            jvmTarget = "1.8"
        }
    }
    tasks.withType<KotlinJvmCompile>().configureEach {
        kotlinOptions {
            jvmTarget = "1.8"
        }
    }
}

/* Redirect build folder */
val newBuildDir = rootProject.layout.buildDirectory.dir("../../build").get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}

subprojects {
    evaluationDependsOn(":app")
}

/* ======================================================
   FLUTTER PLUGIN (ANDROID LIBRARY)
   Selaraskan target JVM ke Java 17 & Kotlin 17
   ====================================================== */
subprojects {

    plugins.withId("com.android.library") {

        extensions.configure<BaseExtension>("android") {

            compileOptions {
                sourceCompatibility = JavaVersion.VERSION_1_8
                targetCompatibility = JavaVersion.VERSION_1_8
            }

            when (project.name) {
                "blue_thermal_printer" ->
                    namespace = "id.kakzaki.blue_thermal_printer"

                "emoji_picker_flutter" ->
                    namespace = "com.jeffg.emoji_picker"
            }
        }
    }

    tasks.withType<JavaCompile>().configureEach {
        sourceCompatibility = "1.8"
        targetCompatibility = "1.8"
    }

    tasks.withType<KotlinCompile>().configureEach {
        kotlinOptions {
            jvmTarget = "1.8"
        }
    }
    tasks.withType<KotlinJvmCompile>().configureEach {
        kotlinOptions {
            jvmTarget = "1.8"
        }
    }
}

/* Clean */
tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
