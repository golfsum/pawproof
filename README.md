# PawProof

A multi-pet care journal for iOS. Built with Expo + Expo Router, Firebase Auth/Firestore/Storage, and Gemini 2.5 Flash for vaccine-record OCR.

PawProof lets pet owners track feeding, walks, training, medications, vet visits, vaccinations, and pet documents — with local notifications for reminders and a PDF health summary export.

## Stack

- **Expo SDK 52** (file-based routing via [expo-router](https://docs.expo.dev/router/introduction/))
- **Firebase** Auth + Firestore + Storage (JS SDK, persisted via AsyncStorage)
- **Gemini 2.5 Flash** for OCR (`generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`)
- **expo-notifications** for local reminders
- **expo-print** for PDF health summary export
- **expo-image-picker** + **expo-document-picker** for photos and document uploads

## Project layout

```
app/                     Expo Router screens
  (auth)/                Sign in / Sign up
  (tabs)/                Home, Pets, Reminders, Records
  pet/                   Pet profile, Add pet, Edit pet
  reminder/add.tsx       Create reminder
  vaccine/{add,scan}.tsx Manual vaccine + OCR scan flow
  document/upload.tsx    Document upload + preview
  paywall.tsx            PawProof Plus paywall (stub)
  settings.tsx           Account + premium toggle

src/
  components/            PetCard, ReminderCard, TimelineRow, QuickLogSheet, etc.
  hooks/                 AuthProvider, useData, useGate
  lib/                   firebase, firestore CRUD, gemini OCR, storage, notifications, pdf, premium
  theme/                 colors, spacing, typography
  types/models.ts        Pet, JournalEntry, Reminder, VaccineRecord, PetDocument
  utils/                 dates, recurrence, petIcon
```

## Getting started

```bash
cp .env.example .env
# Fill in Firebase + Gemini values
npm install
npx expo start --ios
```

> Use **Expo Dev Build** (or a real device with `npx expo run:ios`) — the Firebase SDK and `expo-notifications` won't fully work in Expo Go.

### 1. Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Email/Password**.
3. Enable **Firestore Database** (start in production mode, then apply the rules below).
4. Enable **Storage**.
5. Add a **Web app** to the project (the Web SDK is what we ship; it works fine on iOS via Expo).
6. Copy the config values into `.env`:

   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

#### Firestore rules

Paste into Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /{coll}/{doc} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

#### Storage rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

### 2. Gemini

1. Get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Set `EXPO_PUBLIC_GEMINI_API_KEY` in `.env`.
3. For production, proxy this through a Cloud Function so the key isn't shipped in the JS bundle. The model is `gemini-2.5-flash` and the call is in [src/lib/gemini.ts](src/lib/gemini.ts).

### 3. Sign in with Google + Apple

Both providers are wired to Firebase Auth via `signInWithCredential`. The implementations live in [src/lib/socialAuth.ts](src/lib/socialAuth.ts).

**Firebase Console — enable the providers**

1. Firebase Console → **Authentication → Sign-in method**
2. Enable **Google** (you can leave the project support email as the default)
3. Enable **Apple**. For native iOS sign-in via `expo-apple-authentication` you do **not** need to fill in the Service ID / OAuth code flow fields — the iOS identityToken flow works with just the provider enabled. Fill them in only if you also support web/Android Apple sign-in later.

**Apple Developer**

1. App Store Connect → Identifiers → your App ID → enable the **Sign In with Apple** capability.
2. If you use EAS-managed credentials, EAS handles step 1 automatically the first time you run `eas build`.
3. Apple sign-in **must** be present on iOS if you ship Google sign-in (App Review rule 4.8). The UI already conditionally shows the Apple button on iOS only.

**Google Cloud — OAuth client IDs**

When you enable Google in Firebase Auth, an OAuth client gets created in the linked Google Cloud project automatically. You need two of its values:

1. Google Cloud Console → **APIs & Services → Credentials**
2. Find the **iOS** OAuth 2.0 client (auto-created for your iOS bundle id `com.pawproof.app`). Copy its **Client ID** → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `.env`.
3. Find the **Web application** OAuth 2.0 client (the "Firebase Auth" one, also auto-created). Copy its **Client ID** → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env`. Firebase uses this client ID as the audience for the ID tokens it accepts.
4. Reverse the iOS client ID (e.g. `123456-abcdef.apps.googleusercontent.com` → `com.googleusercontent.apps.123456-abcdef`) and paste it into [app.json](app.json) under `plugins → @react-native-google-signin/google-signin → iosUrlScheme`. The placeholder `com.googleusercontent.apps.REPLACE_ME_WITH_REVERSED_IOS_CLIENT_ID` is there waiting.

> The URL scheme is required for the Google sign-in sheet to redirect back into the app. If it doesn't match the iOS client ID, the native sheet will throw immediately on tap.

After editing `app.json` or `.env`, run `eas build -p ios --profile development` again — Metro picks up `.env` changes on restart, but plugin/Info.plist changes require a rebuild.

### 4. iOS permissions

The plist usage strings are already declared in [app.json](app.json):

- `NSCameraUsageDescription` — scanning vaccine records, taking pet photos
- `NSPhotoLibraryUsageDescription` — attaching photos
- `NSUserNotificationsUsageDescription` — reminder notifications

These propagate automatically when you build with `expo run:ios` or EAS.

## Premium gating

Free tier (enforced in [src/lib/premium.ts](src/lib/premium.ts)):

- 1 pet
- 3 documents
- Basic reminders (no advanced recurring)
- Manual vaccine records (no OCR)
- No PDF export

The paywall flips an `isPremium` flag on the user's Firestore profile. **Replace this with RevenueCat / StoreKit before shipping** — the integration point is [app/paywall.tsx](app/paywall.tsx) (`togglePremium(true)` in the `Start Free Trial` handler).

Premium gates are checked via the `useGate()` hook, which routes to `/paywall` on miss:

```ts
const { check } = useGate();
if (check('ocr_scan')) router.push('/vaccine/scan');
```

## Data model

User-scoped collections under `/users/{uid}`:

| Collection       | Type            |
| ---------------- | --------------- |
| `pets`           | `Pet`           |
| `journalEntries` | `JournalEntry`  |
| `reminders`      | `Reminder`      |
| `vaccines`       | `VaccineRecord` |
| `documents`      | `PetDocument`   |
| `weights`        | `WeightLog`     |

Definitions live in [src/types/models.ts](src/types/models.ts). Firestore Timestamps are coerced to ISO strings at the data layer.

## OCR flow

1. User taps **Scan Vaccine** → [app/vaccine/scan.tsx](app/vaccine/scan.tsx).
2. Camera/library picker captures an image.
3. [src/lib/gemini.ts](src/lib/gemini.ts) calls `gemini-2.5-flash` with the image inline + a strict JSON schema prompt.
4. The confirm screen pre-fills vaccine name / date given / expiration / clinic / lot. **Nothing is saved until the user taps Save.**
5. On save: image uploads to Storage → vaccine record created → expiration reminder scheduled if expiration date is present.

## What's still TODO before launch

- **Replace the stub paywall** with RevenueCat or StoreKit (requires a dev build, not Expo Go).
- **Move Gemini key off-device** — proxy through a Cloud Function.
- **Sign in with Apple** — required by App Review if you ship email/password.
- **Sentry / Crashlytics** + analytics.
- **App icons & splash** (`./assets/icon.png` and `./assets/splash.png` referenced in `app.json` are not committed — drop your assets in).
- **Family / caregiver sharing** — call it out on the paywall but build later.
