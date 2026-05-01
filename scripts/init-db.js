const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    const rawValue = trimmed.slice(equalsAt + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(root, ".env"));

const databaseUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL || process.env.MYSQL_URL;

function config() {
  if (databaseUrl) {
    return {
      uri: databaseUrl,
      charset: "utf8mb4",
      decimalNumbers: true,
      dateStrings: true,
      multipleStatements: true,
    };
  }

  return {
    host: process.env.MYSQLHOST,
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    charset: "utf8mb4",
    decimalNumbers: true,
    dateStrings: true,
    multipleStatements: true,
  };
}

function readSql(fileName) {
  const filePath = path.join(root, fileName);
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/CREATE DATABASE IF NOT EXISTS\s+`?stock`?[\s\S]*?;/i, "")
    .replace(/USE\s+`?stock`?\s*;/i, "");
}

async function main() {
  const connection = await mysql.createConnection(config());

  try {
    await connection.query("SET NAMES utf8mb4");
    await connection.query(readSql("stock_schema.sql"));

    const fixPath = path.join(root, "stock_fix_thai.sql");
    if (fs.existsSync(fixPath)) {
      await connection.query(readSql("stock_fix_thai.sql"));
    }

    const [tables] = await connection.query("SHOW TABLES");
    console.log(`Database initialized. Tables: ${tables.length}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
