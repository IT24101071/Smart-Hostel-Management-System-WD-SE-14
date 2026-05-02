# Smart Hostel Management System — Setup & Run Guide

## Team details

**Group number:** WD-SE-14

| IT Number | Name | Module |
| :--- | :--- | :--- |
| IT24103885 | Senarathna Y.M.C.S. | Room Category & Inventory Management |
| IT24101071 | Risikesan J | Student Enrollment & Booking |
| IT24100505 | Jathusha. V | Staff & Warden Administration |
| IT24103829 | Ahamed M.N.K. | Fee & Payment Tracking |
| IT24101603 | Palihawadana T. S. | Maintenance & Complaint Ticketing |
| IT24103041 | Buddhika P.Y.H | Visitor & Security Logging / Admin Management |

**Repository:** [https://github.com/IT24101071/Smart-Hostel-Management-System-WD-SE-14](https://github.com/IT24101071/Smart-Hostel-Management-System-WD-SE-14)

---

The sections below describe how to run the **backend API** (Node.js, Express, MongoDB) and the **frontend app** (Expo / React Native) locally. For a short project overview, see [README.md](README.md).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | Use a current **LTS** release (the repo does not pin an `engines` field). |
| **npm** | Comes with Node; used for installing dependencies in `backend/` and `frontend/`. |
| **MongoDB** | A connection string is required (`MONGO_URI`). Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or a local MongoDB instance. |
| **Mobile development** (optional) | Android Studio / Xcode for emulators, or the Expo Go app on a physical device. |

The API listens on **`0.0.0.0`**, so it accepts connections from other machines on your LAN (e.g. a phone running Expo). For a physical device, set `EXPO_PUBLIC_API_URL` to `http://<your-computer-LAN-IP>:<PORT>/api` (not `http://localhost`). The app expects the **API base path to include `/api`** (see [frontend/constants/api.js](frontend/constants/api.js)).

---

## Repository layout

| Path | Description |
|------|-------------|
| `backend/` | REST API: Express routes under `/api/*`, static files under `/uploads`. |
| `frontend/` | Expo Router app; entry `expo-router/entry`. |

---

## Backend setup

1. **Open a terminal** in the project root, then:

   ```bash
   cd backend
   npm install
   ```

2. **Environment file:** copy the example and fill in values.

   ```bash
   cp .env.example .env
   ```

   On Windows (PowerShell), you can use `Copy-Item .env.example .env` from the `backend` folder.

3. **Set variables in `backend/.env`** (see table below).

4. **Start the server**

   - Development (auto-restart): `npm run dev`
   - Production-style: `npm start`

5. **Verify:** confirm the terminal prints that the server is listening on your chosen `PORT`.

6. **One-time DB migration (ticket assignees):** If your database still has legacy ticket `assignedTo` fields, run from the `backend/` folder: `node scripts/migrate-tickets-assignees.js` (requires `MONGO_URI` in `.env`). Safe to re-run; it only updates documents that still have `assignedTo` and an empty `assignees` array.

### Backend environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Defaults to **5000** if unset. |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Secret for signing JWTs. Generate a strong value, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (also noted in `.env.example`). |
| `R2_ENDPOINT` | Cloudflare R2 (or S3-compatible) — file storage. |
| `R2_ACCESS_KEY_ID` | R2 access key. |
| `R2_SECRET_ACCESS_KEY` | R2 secret key. |
| `R2_BUCKET_NAME` | Bucket name. |
| `R2_PUBLIC_URL` | Public base URL for uploaded assets. |
| `ADMIN_SECRET_KEY` | Used for admin-only operations where implemented. |
| `BREVO_API_KEY` | Brevo (email) API key. |
| `BREVO_SENDER_EMAIL` | Sender email for transactional mail. |
| `BREVO_SENDER_NAME` | Sender display name. |

---

## Optional: seed an admin user

From the `backend` directory (with `.env` configured and MongoDB reachable):

```bash
node seed-admin.js
```

**Security:** the script creates a default admin account with credentials defined in [backend/seed-admin.js](backend/seed-admin.js). Use this only for **local development**. Change the password (and do not commit real secrets) before any shared or production deployment.

---

## Frontend setup

1. **Install dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Environment file:** copy the example and set the API URL.

   ```bash
   cp .env.example .env
   ```

   In [frontend/.env.example](frontend/.env.example) the line may be commented; uncomment and set:

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.x:5000/api
   ```

   - **Same machine, web or emulator:** `http://localhost:5000/api` or `http://10.0.2.2:5000/api` (Android emulator) if you set the variable; otherwise the app can infer a dev URL (see `frontend/constants/api.js`).
   - **Physical phone on Wi‑Fi:** use your computer’s LAN IP, the backend `PORT`, and the `/api` suffix (the API must be reachable on the network).
   - **Production:** e.g. `https://your-api.example.com/api` if the server mounts routes the same way as this repo.

3. **Start Expo**

   ```bash
   npx expo start
   ```

   Clear Metro cache if you hit stale bundle issues:

   ```bash
   npx expo start --clear
   ```

### Frontend npm scripts

| Script | Command |
|--------|---------|
| `npm start` | `expo start` |
| `npm run web` | `expo start --web` |
| `npm run android` | `expo run:android` (native build) |
| `npm run ios` | `expo run:ios` (macOS / native build) |
| `npm run lint` | `expo lint` |

### Native project folders (`android` / `ios`)

The [frontend/.gitignore](frontend/.gitignore) ignores generated `android/` and `ios/`. For a **development build** or **store build**, generate them with:

```bash
npx expo prebuild
```

For day-to-day JS development with **Expo Go**, prebuild is not required.

---

## API surface (high level)

Base URL for app routes: `http://<host>:<PORT>/api`.

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Authentication |
| `/api/rooms` | Rooms |
| `/api/warden` | Warden |
| `/api/bookings` | Bookings |
| `/api/notifications` | Notifications |
| `/api/payments` | Payments |
| `/api/upload` | Uploads |
| `/api/tickets` | Tickets |
| `/api/visitors` | Visitors |

---

## Troubleshooting

- **Phone cannot reach the API:** ensure the firewall allows inbound connections on the API port, the phone and PC are on the same network, and `EXPO_PUBLIC_API_URL` uses the PC’s LAN IP, not `localhost`.
- **MongoDB errors:** verify `MONGO_URI` and that the cluster allows your IP (Atlas network access).
- **Expo cache:** use `npx expo start --clear`.
