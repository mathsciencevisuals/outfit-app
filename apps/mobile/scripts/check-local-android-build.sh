#!/usr/bin/env bash

set -euo pipefail

has_error=0

check_command() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    printf "OK   command: %s -> %s\n" "$name" "$(command -v "$name")"
  else
    printf "MISS command: %s\n" "$name"
    has_error=1
  fi
}

check_dir() {
  local label="$1"
  local path="$2"
  if [ -n "$path" ] && [ -d "$path" ]; then
    printf "OK   %s: %s\n" "$label" "$path"
  else
    printf "MISS %s: %s\n" "$label" "${path:-<unset>}"
    has_error=1
  fi
}

echo "Checking local Android APK build prerequisites for @fitme/mobile"
echo

check_command node
check_command pnpm
check_command eas
check_command java
check_command javac
check_command adb
check_command sdkmanager

android_sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
java_home="${JAVA_HOME:-}"

check_dir "ANDROID_SDK_ROOT/ANDROID_HOME" "$android_sdk_root"
check_dir "JAVA_HOME" "$java_home"

if [ -n "$android_sdk_root" ]; then
  check_dir "platform-tools" "$android_sdk_root/platform-tools"
  check_dir "cmdline-tools" "$android_sdk_root/cmdline-tools"
fi

echo
echo "Expected mobile API base URL for builds:"
echo "EXPO_PUBLIC_API_URL=https://fitme-api-237152691367.asia-south1.run.app"
echo

if [ "$has_error" -ne 0 ]; then
  cat <<'EOF'
Local APK build is not ready yet.

Install and configure:
1. JDK 17
2. Android SDK command-line tools
3. SDK packages:
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
4. Licenses:
   yes | sdkmanager --licenses

Recommended env vars:
export JAVA_HOME=/path/to/jdk-17
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export ANDROID_HOME=$ANDROID_SDK_ROOT
export PATH=$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$PATH
EOF
  exit 1
fi

cat <<'EOF'
Local APK build prerequisites look available.

Next command:
cd apps/mobile
eas build --platform android --profile preview --local
EOF
