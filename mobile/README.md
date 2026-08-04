# Leaf (mobile)

Expo / React Native app. Talks to the same backend as `frontend/` — no
separate API, same auth (JWT via `/api/auth/*`), same Supabase-backed data.

## Run it

```bash
cd mobile
npm install
npm start
```

Then press `i` for iOS simulator, `a` for Android emulator, or scan the QR
code with Expo Go on a physical device.

## Config

`app.json` → `expo.extra.apiBaseUrl` points at the deployed web app
(`https://leaf-peach.vercel.app` by default). Point it at `http://<your-LAN-ip>:3000`
if you want to hit a local `frontend` dev server instead — `localhost` won't
resolve from a physical device or most simulators.

## Structure

- `app/(auth)/` — login / signup, shown when logged out
- `app/(tabs)/` — the 5 main tabs, shown when logged in
- `lib/auth.tsx` — session state (React context), backed by `expo-secure-store`
- `lib/api.ts` — `authFetch`, same Bearer-token pattern as `frontend/src/utils/auth/client.ts`

## Status

Built so far: auth (login/signup/logout), Feed tab (recently logged books,
active/new reader discovery with follow). Discover, Library, Diary, and
Stats tabs are placeholders — same backend routes the web app already uses
are ready to wire up next.
