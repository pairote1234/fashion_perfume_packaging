# SupplyPilot Deploy Notes

## Current status

- Node/Railway backend is ready in `server.js`.
- Railway start config is ready in `railway.json`.
- Database init script is ready in `scripts/init-db.js`.
- Real secrets must stay in Railway Variables or local `.env`; do not commit `.env`.

## Railway variables

Set one of these in the Railway web service variables:

```text
MYSQL_PUBLIC_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

For the Railway web service, the internal MySQL host is OK:

```text
MYSQL_PUBLIC_URL=mysql://admin:P%40ssw0rd@mysql.railway.internal:3306/stock
```

Do not use `mysql.railway.internal` from your local computer. It only works between Railway services. For local import/testing, use the Railway Public Networking host such as `switchyard.proxy.rlwy.net:PORT`.

or:

```text
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

The app also supports separate MySQL variables:

```text
MYSQLHOST=
MYSQLPORT=
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=
```

## Initialize database

After dependencies are installed:

```bash
npm run init-db
```

Run this from a Railway shell/job or any machine that can reach the configured MySQL host. If `MYSQL_PUBLIC_URL` uses `mysql.railway.internal`, run it inside Railway only.

The init script loads:

- `stock_schema.sql`
- `stock_fix_thai.sql`

It removes local-only `CREATE DATABASE stock` and `USE stock` statements before running, so tables are created in the database from the Railway URL.

## Start

```bash
npm start
```

Railway uses `railway.json` and starts with:

```bash
npm start
```

## Deploy checklist

1. Push this project to GitLab.
2. In Railway, create a new service from the GitLab repo.
3. Set the web service variable:

```text
MYSQL_PUBLIC_URL=mysql://admin:PASSWORD@mysql.railway.internal:3306/stock
```

4. Deploy the web service.
5. Railway runs `npm run railway:start`, which initializes the database before starting the web server.
6. Open the Railway generated domain and test product, sale, shipment, and tracking status actions.

## Local machine requirements

To push and test locally on Windows, install:

- Node.js LTS, which includes `node` and `npm`
- Git for Windows

Then run:

```powershell
cd "D:\1.git\git\Personal Web"
npm install
npm run init-db
npm start
```

For GitLab:

```powershell
git init
git remote add origin https://gitlab.com/pairote.kmutnb/fashion_perfume_packaging.git
git add .
git commit -m "Deploy SupplyPilot Node app"
git branch -M main
git push -u origin main
```
