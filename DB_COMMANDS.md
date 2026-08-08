# Database Commands

This project uses MongoDB with the backend in [`backend`](./backend).

The app reads database connection strings in this order:

1. `LOCAL_DB_URI`
2. `DEV_DB_URI`
3. `DB_URI`

Current local database in [`backend/.env`](./backend/.env):

```env
LOCAL_DB_URI=mongodb://127.0.0.1:27017/ODC_EDU_DB
```

## Important

- Run all commands from `D:\other-working-space\Odc-Edu-WebPortal\backend`
- Make sure MongoDB tools like `mongodump`, `mongorestore`, and `mongosh` are installed
- Be very careful with live database commands
- Commands that use `--drop` or `deleteMany({})` will remove existing data
- Before pushing local data to live, always take a fresh backup of live first

## Go To Backend Folder

```powershell
cd D:\other-working-space\Odc-Edu-WebPortal\backend
```

## Full Database Backup

This project already has a script that exports all collections into:
`backend\seeders\backup\backup.json`

### Backup live DB into JSON

Note: make sure `DB_URI` in `backend\.env` points to live DB before running.

```powershell
npm run db:backup-live
```

### Backup local DB into JSON

Note: temporarily comment `DB_URI` and keep `LOCAL_DB_URI` active if you want this script to read local DB only.

```powershell
node seeders/backupDB.js
```

## Full Restore To Local DB

This restores `seeders\backup\backup.json` into local DB and clears existing local collections before inserting backup data.

```powershell
npm run db:restore-local
```

## Pull Live DB And Store In Local DB

This is the safest repo-based flow using the existing scripts:

### Step 1: backup live DB

```powershell
npm run db:backup-live
```

### Step 2: restore that backup into local DB

```powershell
npm run db:restore-local
```

### One command for full live-to-local sync

```powershell
npm run db:sync-live-to-local
```

## Pull Single Live Collection To Local DB

Use MongoDB CLI tools for one collection only.

Replace:

- `<LIVE_URI>` with live MongoDB connection string
- `<LOCAL_URI>` with local MongoDB connection string
- `<COLLECTION_NAME>` with collection name like `admissions`

### Export one live collection

```powershell
mongodump --uri="<LIVE_URI>" --collection=<COLLECTION_NAME> --out=.\seeders\single-collection-dump
```

### Restore that collection into local DB

`--drop` will delete the local collection first, then restore fresh data from live.

```powershell
mongorestore --uri="<LOCAL_URI>" --drop --collection=<COLLECTION_NAME> .\seeders\single-collection-dump
```

## Pull Single Live Database And Restore Only One Collection Locally

If your dump contains database folders, use this form:

```powershell
mongodump --uri="<LIVE_URI>" --db=ODC_EDU_DB --collection=<COLLECTION_NAME> --out=.\seeders\single-collection-dump
```

```powershell
mongorestore --uri="<LOCAL_URI>" --db=ODC_EDU_DB --drop --collection=<COLLECTION_NAME> .\seeders\single-collection-dump\ODC_EDU_DB\<COLLECTION_NAME>.bson
```

## Delete One Table / Collection Data

MongoDB does not use SQL tables in this project. It uses collections.

### Delete all data from one collection

```powershell
mongosh "<LOCAL_DB_URI>" --eval "db.getCollection('<COLLECTION_NAME>').deleteMany({})"
```

### Drop one collection completely

```powershell
mongosh "<LOCAL_DB_URI>" --eval "db.getCollection('<COLLECTION_NAME>').drop()"
```

## Delete Full Local Database Data

### Drop the whole local database

```powershell
mongosh "mongodb://127.0.0.1:27017/ODC_EDU_DB" --eval "db.dropDatabase()"
```

### Or remove all documents from every collection with project restore flow

The restore script already clears collections before restore:

```powershell
npm run db:restore-local
```

## Push Local DB Data To Live

Warning: this can overwrite live data. Take live backup first.

### Step 1: backup local DB

Make sure the backup script reads local DB.

```powershell
node seeders/backupDB.js
```

### Step 2: restore backup into live DB with MongoDB CLI

If `backup.json` is used, the project does not have a direct script to restore JSON into live safely by URI switch. For live push, use MongoDB dump/restore tools instead of the project JSON restore script.

### Recommended live push flow with MongoDB tools

#### Dump local DB

```powershell
mongodump --uri="mongodb://127.0.0.1:27017/ODC_EDU_DB" --out=.\seeders\local-live-push-dump
```

#### Restore local dump into live DB

Warning: `--drop` will replace existing live collections with local data.

```powershell
mongorestore --uri="<LIVE_URI>" --drop .\seeders\local-live-push-dump
```

## Push One Local Collection To Live

### Dump one local collection

```powershell
mongodump --uri="mongodb://127.0.0.1:27017/ODC_EDU_DB" --collection=<COLLECTION_NAME> --out=.\seeders\single-live-push
```

### Restore one local collection to live

Warning: this replaces that live collection if you use `--drop`.

```powershell
mongorestore --uri="<LIVE_URI>" --drop --collection=<COLLECTION_NAME> .\seeders\single-live-push
```

## Quick Commands Used In This Project

```powershell
cd D:\other-working-space\Odc-Edu-WebPortal\backend
npm run db:backup-live
npm run db:restore-local
npm run db:sync-live-to-local
node seeders/backupDB.js
node seeders/restoreDB.js
```

## Suggested .env Setup

Keep real credentials in `backend\.env` and switch carefully.

Example:

```env
LOCAL_DB_URI=mongodb://127.0.0.1:27017/ODC_EDU_DB
DEV_DB_URI=mongodb://username:password@host:27017/dev_db
DB_URI=mongodb://username:password@host:27017/live_db
```

## Safe Workflow Recommendation

For normal work:

1. Backup live DB
2. Restore backup into local DB
3. Test locally
4. If needed, push only one collection to live instead of full database
5. Take another live backup before any live restore
