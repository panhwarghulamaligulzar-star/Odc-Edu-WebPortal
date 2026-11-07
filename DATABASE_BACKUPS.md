# Database backup management

The Super Admin module is available at **Dashboard → Roles & Permissions → Database Backup Management**. The API is mounted at `/database-backups` and checks the existing Super Admin JWT authorization on every route.

## Backend configuration

Set these variables in the backend environment (not in `VITE_*` variables and never in frontend code):

```env
LOCAL_MONGO_URI=mongodb://127.0.0.1:27017/ODC_EDU_DB
LOCAL_RESTORE_TEST_MONGO_URI=
PRODUCTION_MONGO_URI=
DATABASE_BACKUP_DIR=
MONGODUMP_PATH=mongodump
MONGORESTORE_PATH=mongorestore

# Optional Google Drive integration
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=
GOOGLE_DRIVE_BACKUP_PARENT_ID=
BACKUP_DRIVE_ENCRYPTION_KEY=
```

`LOCAL_DB_URI` remains supported as a backwards-compatible alias for `LOCAL_MONGO_URI`. Production backups use **only** `PRODUCTION_MONGO_URI`; they never fall back to the application's primary `DB_URI` or `MONGODB_URI`. Keep `DB_URI` unchanged for the application's primary connection and set the separate `PRODUCTION_MONGO_URI` in the backend environment used by the backup API. The API refuses an operation when both URIs resolve to the same host, port, and database, and refuses production URIs with a loopback host. Keep production credentials in the backend secret store. Do not copy production credentials into a developer `.env`.

The backend's primary app connection is also separated by runtime environment: development uses `LOCAL_MONGO_URI`, `LOCAL_DB_URI`, or `DEV_DB_URI`; production uses `DB_URI` or `MONGODB_URI`. Development deliberately does not fall back to `DB_URI`/`MONGODB_URI`, so accidentally placing a live URI in the local backend's `DB_URI` cannot make app startup write to that live database. Do not switch a single URI between local and live. Configure the local and production backup targets separately in the environment of the backend that serves the dashboard. For local development, put `LOCAL_MONGO_URI=mongodb://127.0.0.1:27017/ODC_EDU_DB` in the ignored `backend/.env.local` and run `npm run dev`. On the deployed host, keep `NODE_ENV=production` and run `npm start` or the repository's PM2 ecosystem process; do not run `npm run dev` on the production server.

The variable must be available to the backend process that serves `/database-backups`, not the React/Vite frontend. For a self-hosted checkout, add `PRODUCTION_MONGO_URI` to `backend/.env` on the server (or set it in that server's secret manager); setting it in the repository-root `.env` or as `VITE_*` does not configure the backend backup target. The backend loads `backend/.env.local` and `backend/.env` at startup. After changing a backend environment file, restart the backend process (for PM2, `pm2 restart ODC_ALI`; if changing variables injected through the shell or PM2 ecosystem, restart with the updated environment, e.g. `pm2 restart ODC_ALI --update-env`). Reopen the dashboard and refresh. If it still says **Not configured**, verify the variable is present in the backend process configuration without printing or logging its value, and confirm the request is reaching the backend instance you restarted.

For local UI development, the frontend uses the local backend at `http://localhost:5028` through the Vite proxy by default. To use a different development backend, set `VITE_DEV_API_URL` and restart Vite. Development intentionally ignores `VITE_API_URL` so a deployed API setting cannot route local login or data operations to production by accident. Production builds use `VITE_API_URL` (or `VITE_BACKEND_URL`) for the deployed API. These variables select an API server only; they never set either MongoDB connection.

Install MongoDB Database Tools on the backend host and ensure `mongodump` is available on `PATH`, or set `MONGODUMP_PATH` to its absolute executable path. The app creates compressed archive backups in `DATABASE_BACKUP_DIR` or `backend/var/database-backups` by default. The configured location must be outside the backend's public and uploads directories. Keep this directory on persistent, access-controlled storage with sufficient free disk space, and include it in the server's own disaster-recovery plan. Backup metadata and production audit events are kept alongside the backup files.

On Windows, install the official MongoDB Database Tools package on the machine running the backend, then restart the backend so its PATH is refreshed. If the installer does not add the tools folder to PATH, set `MONGODUMP_PATH` in `backend/.env`, for example `MONGODUMP_PATH=C:\Program Files\MongoDB\Tools\100\bin\mongodump.exe` (use the actual installed version/path). `mongodump.exe --version` should work in the same terminal used to start the backend.

## Google Drive

Google Drive is optional. Configure a service account JSON string in `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON`; share a Drive/shared-drive parent folder with that service account and set its ID in `GOOGLE_DRIVE_BACKUP_PARENT_ID`. A parent folder is required because service accounts cannot reliably own files in personal Drive storage. The app creates `ODC Database Backups` with separate Local Development and Live Production folders beneath it.

For encrypted Drive uploads, set `BACKUP_DRIVE_ENCRYPTION_KEY` to a base64-encoded random 32-byte key. Generate and store the key in a secret manager, separately from Drive and backup storage. The UI shows whether a Drive object was encrypted; the encryption IV and authentication tag are recorded in backend metadata. Losing the key or metadata makes the encrypted copy unrecoverable. Uploads are unencrypted when this key is not configured. After upload, the backend compares the streamed MD5 with Drive's stored checksum; successful history entries show as verified.

## Safety and supported operations

- Each environment uses its own separately configured MongoDB URI and the selection is shown in the UI.
- Production overview access and all production backup/download/verify/delete/Drive actions are locked until a local backup has passed integrity verification and the browser has completed the download stream.
- Database overview opens a separate read-only Mongoose connection. Backup creation invokes `mongodump` without a shell and writes a uniquely named `.archive.gz` file. The URI is passed through a temporary, permission-restricted MongoDB Tools config file, not command-line arguments.
- Production backup requires typing `BACK UP LIVE PRODUCTION`; production deletion requires typing `DELETE LIVE PRODUCTION BACKUP`. Production operations are recorded in `production-audit.jsonl`.
- Backup creation is accepted immediately and runs on the backend, so reverse-proxy/browser timeouts do not leave the create request open for the full dump. The UI polls job history until it completes or fails; interrupted jobs are marked failed on the next history request.
- The backend development watcher ignores `var/database-backups/**`; changes to backup metadata or archive files must not restart nodemon while a dump is running.
- Downloads are streamed by the backend with attachment headers. Browsers with the File System Access API stream directly to the chosen local file; other browsers use a short-lived, single-use download ticket and the browser's native download stream rather than buffering the whole archive in JavaScript memory. Run one backend process with the configured shared backup storage so active job and download-ticket state is consistent.
- Verification checks gzip CRC while calculating SHA-256. It does not restore the dump or prove that a restore will succeed.
- Deleting a backup removes its backend copy. If it was uploaded to Drive, the Drive object is retained and its ID remains in history.
- Local restore and all production restore are intentionally unavailable in this initial module. Do not test by restoring over either configured application database. For restore testing, first create a separate, disposable test database and use an explicitly reviewed recovery procedure.
- The legacy `db:sync-live-to-local` and unsafe default restore commands have been removed. The `db:restore-test` utility requires both local URIs to point to the same loopback MongoDB server, and `LOCAL_RESTORE_TEST_MONGO_URI` must name a different database ending in `_RESTORE_TEST`. It remaps only the configured local database, never uses `--drop`, and verifies restored collection/document counts. Example: `npm run db:restore-test -- C:\backups\local-backup.archive.gz`.
- Automatic scheduling is not enabled. The existing app runs a single PM2 instance, but automatic production scheduling is intentionally deferred until a distributed lock, independent retention policy, and deployment-specific schedule have been configured and tested.

## Safe rollout and validation

1. Install MongoDB Database Tools and configure only `LOCAL_MONGO_URI`.
2. Log into the Super Admin UI, select Local Development Database, verify the displayed database name, create a local backup, and download it.
3. Verify the downloaded archive in the UI or with `mongorestore --dryRun` against a supported MongoDB Database Tools version. Never add `--drop` or target an application database for this check.
4. Configure Google Drive with local backups first; verify the uploaded file and retain any encryption key.
5. Only after the local backup and download have been manually verified, store `PRODUCTION_MONGO_URI` in the same backend deployment's secret store/environment settings and restart the backend. Do not set it in frontend variables or local development. `VITE_API_URL` only tells the frontend where to send API requests; it does not configure database credentials. If the Super Admin page says the production database is not configured, creating backups is intentionally disabled until the backend serving that request receives this variable.
6. Verify production access and create/download a production backup only from the deployed Super Admin panel after the explicit confirmation. No production restore is available.
