# Global Archaeology Hub — Native (Expo)

This folder contains the Expo app for **native Android and iOS**. It was created with [Expo](https://docs.expo.dev) and uses the same app name as the web project.

## Quick start

```bash
cd mobile
npm install   # if you haven't already
npm start    # start Metro and choose platform
```

## Run on device / emulator

- **Android** (device or emulator):
  ```bash
  npm run android
  ```
  Requires the **Android SDK** and an emulator or USB device. If you see *"Failed to resolve the Android SDK path"* or *"adb is not recognized"*, see [Android SDK setup (Windows)](#android-sdk-setup-windows) below.

### Android SDK setup (Windows)

To run `npm run android` or `expo run:android` on your PC, you need the Android SDK and `ANDROID_HOME` set.

1. **Install Android Studio** (includes the SDK):
   - Download: [developer.android.com/studio](https://developer.android.com/studio)
   - Run the installer. During setup, note the **Android SDK location** (often `C:\Users\<YourName>\AppData\Local\Android\Sdk`).

2. **Set the ANDROID_HOME environment variable** (use your actual SDK path if different):
   - Press **Win + R**, type `sysdm.cpl`, Enter → **Advanced** tab → **Environment Variables**.
   - Under **User variables**, click **New**:
     - Variable name: `ANDROID_HOME`
     - Variable value: `C:\Users\Alex\AppData\Local\Android\Sdk` (or the path from step 1).
   - Find **Path** in User variables → **Edit** → **New** → add:
     - `%ANDROID_HOME%\platform-tools`
     - `%ANDROID_HOME%\emulator` (optional, for emulators).
   - Click OK on all dialogs, then **close and reopen** your terminal (or VS Code/Cursor) so the new variables apply.

3. **Verify**: In a new PowerShell or CMD window:
   ```bash
   echo %ANDROID_HOME%
   adb version
   ```
   You should see the SDK path and the ADB version.

4. **Run the app**:
   ```bash
   cd mobile
   npm run android
   ```
   Use an Android emulator (create one in Android Studio: **Device Manager**) or a physical device with **USB debugging** enabled.

**Don’t want to install the SDK?** You can build the APK in the cloud with **EAS Build** (see [Build .apk and .ipa for sideloading](#build-apk-and-ipa-for-sideloading)) and install that APK on your phone—no Android Studio required on your machine.

- **iOS** (Mac only; device or simulator):
  ```bash
  npm run ios
  ```
  Requires Xcode. On Windows, use [Expo Go](https://expo.dev/go) on a physical iPhone or build in the cloud with [EAS Build](https://docs.expo.dev/build/introduction/).

- **Web** (same codebase in the browser):
  ```bash
  npm run web
  ```

## Native projects (android / ios)

Native projects were generated with:

```bash
npx expo prebuild
```

- **Android**: `android/` is present after prebuild on this machine.
- **iOS**: `ios/` is only generated on **macOS** (Xcode required). On a Mac, run `npx expo prebuild` inside `mobile/` to create the `ios` folder, then `npm run ios`.

The repo’s `.gitignore` in this folder ignores `/android` and `/ios` by default so they can be regenerated. If you want to commit them, remove those lines from `mobile/.gitignore`.

## Build .apk and .ipa for sideloading

This project is set up to use **[Codemagic](https://codemagic.io)** for CI/CD. Configuration is in the repo root: **`codemagic.yaml`**.

### Codemagic (recommended)

1. Push this repo to GitHub (or another Git host Codemagic supports).
2. In [Codemagic](https://codemagic.io), add the application and connect the repository.
3. Codemagic will detect **`codemagic.yaml`** in the repo root. Use it as the build configuration.
4. Start a build:
   - **Android (APK):** run the workflow **Android (APK)**. The APK is in the build artifacts.
   - **iOS (IPA):** run the workflow **iOS (IPA)**. Requires Apple code signing to be set up in Codemagic (App Store Connect API key, certificates). The IPA is in the build artifacts.

The YAML runs `expo prebuild` on the server, then builds the native project. No Android Studio or Xcode on your machine is required.

**Optional:** To sign the Android release build, add a keystore in Codemagic (Team settings → Code signing identities → Android keystores), then in `codemagic.yaml` under the Android workflow uncomment `android_signing` and set the keystore reference. For iOS, configure **App Store Connect** integration and `ios_signing` in the YAML.

### EAS Build (alternative)

You can still use Expo’s EAS Build if you prefer:

- `npx eas-cli login` and `npx eas-cli init` (one-time), then  
- `npm run build:apk` or `npm run build:ipa` from the `mobile/` folder.

**iOS note:** Building an IPA for a real device requires a **paid Apple Developer account** ($99/year) and code signing set up in Codemagic or EAS.

## Relation to the web app

The main web app lives in the repo root (Vite + React). This Expo app is a separate entry point for native; you can gradually share logic (e.g. Supabase, API clients) between the two or later move to a single Expo codebase with web + native.

## Docs

- [Install Expo modules in existing RN project](https://docs.expo.dev/bare/installing-expo-modules/)
- [Expo prebuild](https://docs.expo.dev/workflow/prebuild/)
- [EAS Build (cloud iOS/Android)](https://docs.expo.dev/build/introduction/)
