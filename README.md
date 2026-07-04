# jipatabykapi

jipatabykapi is a Node.js + Express web app for stock, sales, shipment, and import tracking. It serves the dashboard from `index.html` and exposes MySQL-backed API endpoints from `server.js`.

## Tech Stack

- Node.js 20+
- Express
- MySQL, including Railway MySQL
- Railway deploy config in `railway.json`

## Local Setup

```powershell
cd "D:\1.git\git\Personal Web"
npm install
```

Create `.env` from `.env.example`, then set one database connection style:

```text
MYSQL_PUBLIC_URL=mysql://user:password@host:port/database
```

or:

```text
MYSQLHOST=
MYSQLPORT=3306
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=
```

Initialize the database:

```powershell
npm run init-db
```

Start the app:

```powershell
npm start
```

Open `http://localhost:3000`.

## Railway Deploy

Railway uses `railway.json` and starts the app with:

```bash
npm run railway:start
```

That command runs `scripts/init-db.js` first, then starts `server.js`. The init script loads:

- `stock_schema.sql`
- `stock_fix_thai.sql`

Set this variable on the Railway web service:

```text
MYSQL_PUBLIC_URL=mysql://USER:PASSWORD@mysql.railway.internal:3306/DATABASE
```

Use the Railway internal host only inside Railway. For local testing from this computer, use Railway Public Networking instead, for example:

```text
MYSQL_PUBLIC_URL=mysql://USER:PASSWORD@switchyard.proxy.rlwy.net:PUBLIC_PORT/DATABASE
```

## GitHub Sync

If the GitHub repository already exists:

```powershell
git remote set-url origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

If you want to keep the current GitLab remote and add GitHub as a second remote:

```powershell
git remote add github https://github.com/<owner>/<repo>.git
git push -u github main
```

After the GitHub push, connect Railway to the GitHub repo and select the `main` branch. Railway will auto-deploy future pushes.

## Important Files

- `server.js`: Express API and static file server
- `scripts/init-db.js`: database initialization for local/Railway
- `railway.json`: Railway build and start command
- `.env.example`: database variable examples
- `stock_schema.sql`: schema and seed data
- `stock_fix_thai.sql`: Thai text/data fixes
