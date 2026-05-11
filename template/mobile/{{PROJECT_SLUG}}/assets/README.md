# Assets

These ship as placeholders so the app builds and runs on day one. Replace
each with your own art before you publish.

| File | Used by | Recommended size |
|---|---|---|
| `icon.png` | iOS app icon, fallback for tools that don't read `adaptive-icon` | 1024×1024, no rounded corners |
| `adaptive-icon.png` | Android adaptive icon foreground | 1024×1024, content within central 66% safe area |
| `splash-icon.png` | Splash screen logo (centered, native + animated) | 1284×2778 or 1200×1200 if `resizeMode: contain` |
| `favicon.png` | Web build | 48×48 |

Background colors come from `app.json` (`splash.backgroundColor` and
`android.adaptiveIcon.backgroundColor`) — both are wired to the project's
primary color at scaffold time.

## Generating from a single source

If you have one master logo, the easiest path is **`expo-icon`** /
**`@expo/cli` icon generation** — or any of the standard icon-set
generators. Manual:

```bash
# install once
npm install -g @expo/icon

# from project root
expo-icon ./logo.png
```

For Android adaptive icons, keep the focal element inside the central
66% — outside that ring, Android crops dynamically per launcher.
