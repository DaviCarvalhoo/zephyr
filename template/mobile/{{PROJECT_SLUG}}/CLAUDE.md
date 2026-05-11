# mobile/{{PROJECT_SLUG}}/

Expo + React Native + TypeScript. Free-first flow with deferred
auth, 5-tab navigator, offline SQLite, custom-native modules.

```
src/
├── App.tsx, index.ts
├── config.ts                  API base URL + provider client IDs
├── theme/colors.ts            Palette generated from primary color
├── i18n/                      pt-BR default + en (react-i18next)
├── contexts/
│   ├── AuthContext.tsx        token + refresh, anonymous mode,
│   │                           hasCompletedOnboarding gate
│   └── ThemeContext.tsx       light/dark, AsyncStorage-persisted
├── routes/
│   ├── index.tsx              OnboardingStack ↔ AppStack switch
│   └── types.ts               Typed param lists for nav
├── pages/
│   ├── onboarding/            Welcome → Onboarding → FirstAction
│   ├── auth/                  AuthLanding (modal) + Login/Signup/Forgot
│   └── main/                  Home, Explore, Action, Library, Profile
├── services/
│   ├── api.ts, fetch-api.ts   Typed endpoint surface
│   ├── db/                    SQLite (USER_TABLES vs SHARED_TABLES)
│   ├── backup/                Two-phase S3 backup (premium)
│   ├── content/               Versioned catalog + HMAC-signed URLs
│   ├── iap/                   react-native-iap wrapped lazily
│   ├── notifications/         Custom-native, cold-start tap dispatch
│   └── health/                Apple Health + Health Connect unified
└── components/
    ├── AnimatedSplash.tsx
    ├── ToastConfig.tsx
    ├── PremiumGate.tsx
    └── LanguagePicker.tsx
native/                        Custom Swift/Kotlin (cookbook + active)
plugins/                       Expo config plugins
```

Path alias: `@/*` → `./src/*`. Use it.

## Navigation tree (the mental model)

```
hasCompletedOnboarding
├── false → OnboardingStack
│           Welcome → Onboarding → FirstAction
│           └── completeOnboarding() flips the gate
└── true  → AppStack
            ├── MainTabs (anonymous OK — no auth wall)
            │   ├── Home / Explore / Action (center) / Library / Profile
            │   └── Tabs work without sign-in. Premium features
            │       are gated by <PremiumGate />, not by signed.
            └── AuthStack (modal, slide_from_bottom)
                AuthLanding (✕) → Login / Signup / Forgot
                Reached only via Profile or a PremiumGate's onUpgrade.
                Success → getParent()?.goBack() dismisses to MainTabs.
```

## The non-negotiables

- **Free-first.** The app must be usable without sign-in. Never
  render an "auth required" screen at the entry point. Wrap
  premium features in `<PremiumGate onUpgrade={openAuth} />`.

- **Routes go through models** — same rule as server. Mobile
  doesn't have models; the equivalent is: **services own data
  access**. Pages call `getContentByType('post')`, not
  `getDb().getAllAsync(...)`. New SQLite reads/writes go in the
  matching `services/<thing>/` folder.

- **User-scoped writes check `demandSigned()`** at the top of the
  function. Reads always work; writes silently no-op when the gate
  is closed (logout transition).

- **Refresh-token rotation is single-flighted.** `_doRefresh._inFlight`
  in AuthContext. Concurrent callers share the in-flight Promise so
  a race doesn't trigger a false logout.

- **Every user-facing string goes through `t()`.** Even pt-BR
  default strings. No bare strings in JSX.

- **NitroModules + Expo Go = crash on import.** Anything using
  nitro (e.g. `react-native-iap` v15) must be lazy-loaded with
  `try/require`. See `services/iap/index.ts`.

- **`expo prebuild --clean` will silently delete native code.**
  Use `./scripts/prebuild.sh` (refuses --clean). To genuinely
  reset, move customizations into `plugins/` first.

## Adding a screen

1. **Page** — `src/pages/<scope>/<Name>.tsx`. Typed via
   `NativeStackScreenProps<ParamList, 'Name'>`.

2. **Register** in `routes/index.tsx` and add the entry to
   `routes/types.ts`'s ParamList union.

3. **Translations** — every visible string goes into
   `i18n/locales/pt-BR.ts` first (it's the source of truth shape),
   then mirror in `en.ts`. TypeScript enforces parity.

4. **Use the `useTheme()` hook** for colors. Never hardcode hex
   values except for cross-locale-consistent accents (option dots,
   etc — keep those keyed by id in a constant).

## Native modules

`native/` is the cookbook. After `./scripts/prebuild.sh`, run
`./scripts/install-native.sh` to copy them into the prebuilt
`ios/` + `android/` and substitute `<ANDROID_PACKAGE>`. The script
prints the manual AppDelegate / MainActivity / AndroidManifest
patches needed — those are NOT auto-applied because Expo plugins
regenerate those files and clobbering them loses other
customizations.

See `native/README.md` for the full gotchas list (NativeEventEmitter
crash on iOS, CFBundleVersion sync for extensions, etc.).

## Commands (from mobile/{{PROJECT_SLUG}}/)

```bash
npm run start       # Expo Metro
npm run ios         # build + run iOS (also ../../scripts/run-ios.sh)
npm run android
npm run prebuild    # safe wrapper (refuses --clean)
```

Mobile-specific scripts live at the **project root** in
`scripts/` so you find every helper in one place:

- `scripts/bump-version.sh` — bumps version everywhere atomically
- `scripts/run-ios.sh` — auto-detects connected device
- `scripts/release-android.sh` — EAS local build → submit to Play
- `scripts/install-native.sh` — copy native + print patches
- `scripts/generate-icons.sh` — re-run the icon generator
- `scripts/extract-play-key.js` — pull Play key from server/.env

## Auth flow recap

Email/password and Apple Sign-In are direct. Google uses
**server-side OAuth** to keep the client_secret out of the bundle:

```
Client → /api/auth/google/app
       → Google OAuth screen
       → /api/auth/google/callback (server exchanges code, mints tokens)
       → {{MOBILE_SCHEME}}://auth?token=…&refreshToken=…
       → Linking listener → continueWithToken()
```

`signOut()` clears auth + onboarding state so the next user starts
from Welcome (matches tranqs's pattern; onboarding is per-account).

## Premium

`<PremiumGate>` renders children if `user.is_premium`, otherwise a
locked card with an `onUpgrade` CTA. In Library:

```tsx
<PremiumGate onUpgrade={() => navigation.navigate('AuthStack')}>
    <PremiumFeature />
</PremiumGate>
```

`refreshPremiumStatus()` runs on every foreground transition (see
`<PremiumStatusRefresher />` in routes) so external cancellations
in App Store / Play Store get caught without webhooks.
