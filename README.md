# Citizen Reports

A citizen incident-reporting app. Users report incidents (accident, fighting, rioting, fire, …) with **photos** and **GPS location**. Reports are **published immediately**, all other users are **notified**, and everyone can **browse by category**. Logged-in users can see the **incidents they submitted**.

| Part | Stack |
|------|-------|
| `backend/` | Node.js · Express · SQLite (`node:sqlite`, built into Node ≥ 22.5) · JWT auth · Multer uploads · Socket.IO · Expo Push API |
| `mobile/` | React Native (JavaScript) · Expo SDK 58 · Expo Router · expo-image-picker · expo-location · expo-notifications · react-native-maps |

## Feature map

| # | Requirement | How it's implemented |
|---|-------------|----------------------|
| 1 | Add a new incident | **Report** tab → `POST /api/incidents` (multipart) |
| 2 | Browse all incidents | **Feed** tab, paginated + pull-to-refresh → `GET /api/incidents` |
| 3 | Auto-posted for others | Incidents are saved with `status = 'published'` and broadcast over Socket.IO; open feeds refresh live |
| 4 | Notify on new incident | Socket.IO event → local notification + in-app banner (works in Expo Go). Expo push notifications reach closed apps (needs a dev/production build, see below) |
| 5 | Browse by category | Category chips on the Feed, plus a **Categories** tab with counts → `GET /api/incidents?category=accident` |
| 6 | Geolocation (lat/long) | `expo-location` auto-captures coordinates + reverse-geocoded address; shown on a map with "Open in Maps" |
| 7 | Pictures | Camera or gallery, up to 5 per report; stored in `backend/uploads/`, shown as a swipeable gallery |
| 8 | Login / my incidents | Register/login (bcrypt + JWT, session stored on the device) → **My Reports** tab → `GET /api/incidents/mine`. Long-press one of your reports to delete it |

## Running it

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # set JWT_SECRET
npm start                 # http://0.0.0.0:4000/api
npm test                  # end-to-end API test
```

The database (`data/incidents.db`) and the uploads folder are created automatically. Categories are seeded on first run.

**Demo data:** `npm run seed` adds 3 demo accounts and 12 sample incidents, spread across every category with photos and locations. `npm run seed -- --reset` recreates them.

| Email | Name | Password |
|-------|------|----------|
| amina@demo.com | Amina Bello | Password123 |
| chidi@demo.com | Chidi Okafor | Password123 |
| tunde@demo.com | Tunde Adeyemi | Password123 |

### 2. Mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go**, with your phone on the same Wi-Fi as your computer. The app automatically calls the backend on the computer running Metro, at port 4000. To point it at another server:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npx expo start
```

Press `a` for the Android emulator (it uses `10.0.2.2:4000`) or `w` for web.

> On Windows, allow Node.js through the firewall on private networks so your phone can reach ports 4000 and 8081.

### Push notifications when the app is closed

Expo Go cannot receive remote push notifications on Android. Live in-app notifications still work everywhere. For background push:

1. `npx eas-cli@latest init`. This adds `extra.eas.projectId` to the app config.
2. Set up FCM credentials (Android) or APNs (iOS): https://docs.expo.dev/push-notifications/push-notifications-setup/
3. Build a development build: `npx eas-cli@latest build --profile development`, or `npx expo run:android`.

The app then registers its Expo push token with `POST /api/push-tokens`, and the server pushes to every device except the reporter's.

## API reference

All routes are prefixed with `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | – | `{name, email, password}` → `{token, user}` |
| POST | `/auth/login` | – | `{email, password}` → `{token, user}` |
| GET | `/auth/me` | ✓ | Current user |
| GET | `/categories` | – | Categories with incident counts |
| GET | `/incidents?category=&q=&page=&limit=` | – | Published incidents, newest first |
| GET | `/incidents/mine` | ✓ | The logged-in user's incidents |
| GET | `/incidents/:id` | – | One incident |
| POST | `/incidents` | ✓ | multipart: `title`, `category` (slug), `latitude`, `longitude`, optional `description`, `address`, `images[]` (≤ 5, ≤ 8 MB each) |
| DELETE | `/incidents/:id` | ✓ owner | Delete your own report |
| POST | `/push-tokens` | optional | `{token}`: register an Expo push token |

Socket.IO events: `incident:new` (full incident payload) and `incident:deleted` (`{id}`).

## Project layout

```
backend/
  src/server.js      Express + Socket.IO bootstrap
  src/routes.js      REST endpoints, uploads, validation
  src/db.js          SQLite schema + category seed
  src/auth.js        JWT helpers / middleware
  src/notify.js      Socket broadcast + Expo push fan-out
  test/api.test.js   End-to-end test (spawns the server)
mobile/
  src/app/           Expo Router screens
    (tabs)/index.js       Feed (with category filter)
    (tabs)/categories.js  Category grid
    (tabs)/report.js      New incident form (camera, gallery, GPS, map)
    (tabs)/mine.js        My reports + logout
    incident/[id].js      Detail: photos, map, coordinates
    category/[slug].js    Incidents in one category
    login.js / register.js
  src/context/       AuthContext (session), LiveContext (socket + notifications)
  src/components/    Cards, lists, map (native + web), buttons, forms
  src/lib/           API client, config, theme
```
