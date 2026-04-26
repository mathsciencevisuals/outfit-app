const { accessSync, constants } = require("fs");
const { delimiter, join, sep } = require("path");
const { spawnSync } = require("child_process");

const isWindows = process.platform === "win32";
const hasError = { value: false };

function logStatus(ok, label, detail) {
  const prefix = ok ? "OK  " : "MISS";
  console.log(`${prefix} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) {
    hasError.value = true;
  }
}

function fileExists(path) {
  if (!path) {
    return false;
  }

  try {
    accessSync(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function commandVariants(name) {
  if (!isWindows) {
    return [name];
  }

  const lower = name.toLowerCase();
  if (lower === "sdkmanager") {
    return ["sdkmanager.bat", "sdkmanager"];
  }

  return lower.endsWith(".exe") || lower.endsWith(".bat") || lower.endsWith(".cmd")
    ? [name]
    : [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name];
}

function findCommand(name) {
  const pathValue = process.env.PATH ?? "";
  const directories = pathValue.split(delimiter).filter(Boolean);

  for (const directory of directories) {
    for (const variant of commandVariants(name)) {
      const candidate = join(directory, variant);
      if (fileExists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function checkCommand(name, options = {}) {
  const resolved = findCommand(name);
  logStatus(Boolean(resolved), `command ${name}`, resolved ?? options.hint ?? "");
}

function checkPath(label, targetPath) {
  logStatus(fileExists(targetPath), label, targetPath ?? "<unset>");
}

function detectAndroidSdkRoot() {
  return process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || null;
}

function detectJavaHome() {
  return process.env.JAVA_HOME || null;
}

function checkSdkLayout(androidSdkRoot) {
  if (!androidSdkRoot) {
    return;
  }

  checkPath("platform-tools", join(androidSdkRoot, "platform-tools"));
  checkPath("cmdline-tools", join(androidSdkRoot, "cmdline-tools"));

  const sdkManagerPath = isWindows
    ? join(androidSdkRoot, "cmdline-tools", "latest", "bin", "sdkmanager.bat")
    : join(androidSdkRoot, "cmdline-tools", "latest", "bin", "sdkmanager");

  logStatus(fileExists(sdkManagerPath), "sdkmanager path", sdkManagerPath);
}

function printCommandVersion(command, args) {
  const result = spawnSync(command, args, { stdio: "pipe", encoding: "utf8", shell: false });
  if (result.status === 0) {
    const firstLine = `${result.stdout || result.stderr}`.split(/\r?\n/).find(Boolean);
    if (firstLine) {
      console.log(`INFO ${command} -> ${firstLine}`);
    }
  }
}

console.log("Checking local Android APK build prerequisites for @fitme/mobile");
console.log("");

checkCommand("node");
checkCommand("pnpm");
checkCommand("eas");
checkCommand("java");
checkCommand("javac");
checkCommand("adb");
checkCommand("sdkmanager");

const androidSdkRoot = detectAndroidSdkRoot();
const javaHome = detectJavaHome();

checkPath("ANDROID_SDK_ROOT/ANDROID_HOME", androidSdkRoot);
checkPath("JAVA_HOME", javaHome);
checkSdkLayout(androidSdkRoot);

console.log("");
console.log("Expected mobile API base URL for builds:");
console.log("EXPO_PUBLIC_API_URL=https://fitme-api-237152691367.asia-south1.run.app");
console.log("");

if (!hasError.value) {
  const javaCommand = isWindows ? "java.exe" : "java";
  const adbCommand = isWindows ? "adb.exe" : "adb";
  printCommandVersion(javaCommand, ["-version"]);
  printCommandVersion(adbCommand, ["version"]);
}

if (hasError.value) {
  console.log("Local APK build is not ready yet.");
  console.log("");
  console.log("Install and configure:");
  console.log("1. JDK 17");
  console.log("2. Android SDK command-line tools");
  console.log('3. SDK packages: sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"');
  console.log("4. Licenses: sdkmanager --licenses");
  console.log("");
  if (isWindows) {
    console.log("Recommended Windows environment variables:");
    console.log("JAVA_HOME=C:\\Program Files\\Eclipse Adoptium\\jdk-17...");
    console.log("ANDROID_SDK_ROOT=%LOCALAPPDATA%\\Android\\Sdk");
    console.log("ANDROID_HOME=%LOCALAPPDATA%\\Android\\Sdk");
  } else {
    console.log("Recommended environment variables:");
    console.log("export JAVA_HOME=/path/to/jdk-17");
    console.log("export ANDROID_SDK_ROOT=$HOME/Android/Sdk");
    console.log("export ANDROID_HOME=$ANDROID_SDK_ROOT");
    console.log("export PATH=$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH");
  }
  process.exit(1);
}

console.log("Local APK build prerequisites look available.");
console.log("");
console.log("Next command:");
console.log("cd apps/mobile");
console.log("eas build --platform android --profile preview --local");
