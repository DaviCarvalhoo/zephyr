# {{PROJECT_NAME}} — mobile

Expo + React Native + TypeScript. Pre-wired with auth (email/password,
Apple, Google), theme (light/dark), navigation, splash, toast, and a
typed fetch client pointed at the project's admin API.

## Quick start

```bash
npm install
npm run start          # Metro + QR — open with Expo Go for the JS-only flow
npm run ios            # build + run on iOS (requires Xcode)
npm run android        # build + run on Android (requires Android Studio)
```

For a clean iOS run that picks a connected device automatically:

```bash
./scripts/run-ios.sh                     # device if attached, else simulator
./scripts/run-ios.sh --simulator         # force simulator
./scripts/run-ios.sh --device "iPhone X" # specific device
```

## Project structure

```
mobile/{{PROJECT_SLUG}}/
├── App.tsx                       app entry
├── index.ts                      registers App with Expo
├── app.json                      Expo config (icon, splash, perms,
│                                 plugins, bundle/package ids)
├── eas.json                      EAS Build profiles
├── babel.config.js               worklets plugin (Reanimated)
├── eslint.config.js              same standards as the rest of the repo
├── tsconfig.json                 strict TS + @/* path alias
├── assets/                       icon/splash/favicon — see assets/README.md
├── native/                       cookbook stub (Phase 7)
├── scripts/
│   ├── bump-version.sh           bumps version everywhere
│   ├── prebuild.sh               safe expo prebuild (refuses --clean)
│   ├── run-ios.sh                build+run on iOS
│   ├── release-android.sh        EAS local build → submit to Play
│   └── generate-icons.sh         re-run the icon generator
└── src/
    ├── config.ts                 API base URL + provider client IDs
    ├── theme/colors.ts           generated palette (primary from CLI)
    ├── contexts/
    │   ├── AuthContext.tsx       token + refresh + AsyncStorage
    │   └── ThemeContext.tsx      light/dark, persisted
    ├── routes/
    │   ├── index.tsx             AuthStack ↔ AppStack switch
    │   └── types.ts              typed param lists for navigation
    ├── pages/
    │   ├── auth/                 AuthLanding, Login, Signup, Forgot
    │   └── main/                 Home, Profile
    ├── components/
    │   ├── AnimatedSplash.tsx    splash → JS handoff animation
    │   └── ToastConfig.tsx       theme-aware toast styles
    └── services/
        ├── api.ts                typed endpoint surface
        └── fetch-api.ts          fetch wrapper (timeouts, JSON, auth)
```

## Auth

Pre-wired flows:

- **Email + password** — `signIn`, `signUp`, `forgotPassword` from
  `useAuth()`. Server returns `{ token, refreshToken }` and the mobile
  side stores them in AsyncStorage.
- **Apple Sign-In** (iOS only, gated by `AppleAuthentication.isAvailableAsync`)
  posts the native `id_token` to `/api/auth/apple/mobile`. Server
  verifies via Apple's JWKS, find-or-creates the user.
- **Google** uses a server-side OAuth flow:
  1. App opens `${baseApiUrl}/api/auth/google/app` in `WebBrowser`.
  2. Server redirects to Google with state.
  3. Google → `/api/auth/google/callback` → tokens minted server-side.
  4. Server redirects to `<scheme>://auth?token=...&refreshToken=...`
  5. App captures the URL, calls `continueWithToken`.

This keeps the OAuth client_secret out of the app bundle and lets one
Web client serve web + iOS + Android.

### Required env vars (server-side)

```
APPLE_BUNDLE_ID={{IOS_BUNDLE_ID}}
GOOGLE_WEB_CLIENT_ID=<from Google Cloud Console>
GOOGLE_WEB_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=http://localhost:{{API_PORT}}/api/auth/google/callback
MOBILE_SCHEME={{MOBILE_SCHEME}}
```

In Google Cloud Console add the same redirect URI (and your prod one)
under your Web OAuth Client → Authorized redirect URIs.

## Refresh token rotation

Refresh tokens are single-use: every `/api/auth/refresh` deletes the old
RT and issues a new one. The `AuthContext` guards concurrent refreshes
with an in-flight Promise so race conditions don't trigger false
logouts. If you fork the auth code, preserve that guard.

## Theme

The primary color you picked at scaffold time is wired into:

- `app.json` splash background + adaptive icon background
- `src/theme/colors.ts` (light + lifted dark variant)
- `assets/icon.png` and friends (regenerate via `./scripts/generate-icons.sh`)

To change later, edit those three places — or just regenerate icons
with `./scripts/generate-icons.sh path/to/new-logo.png`.

## Icons & splash

See `assets/README.md` for the full target list and sizes. Two paths:

```bash
# Regenerate from the project's primary color + first letter
./scripts/generate-icons.sh

# Regenerate from a 1024×1024 source PNG
./scripts/generate-icons.sh path/to/logo.png
```

The generator outputs `icon.png`, `adaptive-icon.png`, `splash-icon.png`,
`favicon.png`, plus store-listing variants (`appstore.png`, `playstore.png`).

## Native modules

The `native/` directory is a cookbook stub today — Phase 7 fills in
working iOS Swift + Android Kotlin module examples plus a Live Activity
scaffold. For now, `native/README.md` lays out where things go and why
custom native is sometimes the right call.

## Deploying

1. `./scripts/bump-version.sh patch` — patches version everywhere.
2. iOS: `eas build --platform ios --profile production` (or open Xcode).
3. Android: `./scripts/release-android.sh` builds locally and submits
   to Play Store internal track in one go.

## Code standards

Same as the rest of the project: 4-space indent, semis, max 80 cols,
braces always, no silent `catch` blocks. ESLint is configured to enforce
this in `eslint.config.js`. See `code.md` at the repo root for the full
list — *all rules apply equally to TypeScript on RN*.
