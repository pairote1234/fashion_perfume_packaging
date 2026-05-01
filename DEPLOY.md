# SupplyPilot Deploy Notes

## Current Status

- Node/Railway backend is ready in `server.js`.
- Railway start config is ready in `railway.json`.
- Database init script is ready in `scripts/init-db.js`.
- Real secrets must stay in Railway Variables or local `.env`; do not commit `.env`.

## Railway Variables

Set this on the Railway web service:

```text
MYSQL_PUBLIC_URL=mysql://USER:PASSWORD@mysql.railway.internal:3306/DATABASE
```

The app also supports:

```text
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

or separate MySQL variables:

```text
MYSQLHOST=
MYSQLPORT=3306
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=
```

Use `mysql.railway.internal` only inside Railway. From your local computer, use the Railway Public Networking host such as `switchyard.proxy.rlwy.net:PUBLIC_PORT`.

## Railway Start

Railway reads `railway.json` and runs:

```bash
npm run railway:start
```

That command initializes the database, then starts the web server:

```bash
node scripts/init-db.js && node server.js
```

The init script loads:

- `stock_schema.sql`
- `stock_fix_thai.sql`

It removes local-only `CREATE DATABASE stock` and `USE stock` statements before running, so tables are created in the database selected by the Railway URL.

## GitHub + Railway Checklist

1. Create or open the GitHub repository.
2. Point this local repo to GitHub:

```powershell
git remote set-url origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

If you want to keep GitLab as `origin`, add GitHub separately:

```powershell
git remote add github https://github.com/<owner>/<repo>.git
git push -u github main
```

3. In Railway, create a new service from the GitHub repo.
4. Add a Railway MySQL database service.
5. Set the web service variable:

```text
MYSQL_PUBLIC_URL=mysql://USER:PASSWORD@mysql.railway.internal:3306/DATABASE
```

6. Deploy the web service.
7. Open the Railway generated domain and test product, sale, shipment, and tracking status actions.

## Local Commands

```powershell
cd "D:\1.git\git\Personal Web"
npm install
npm run init-db
npm start
```
