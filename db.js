import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Sestavení konfigurace DB z URL nebo jednotlivých env proměnných
function buildDbConfig() {
  const fromUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  const base = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Pokud je k dispozici URL, parsujeme ji (např. z Aiven: mysql://user:pass@host:port/db?ssl-mode=REQUIRED)
  if (fromUrl) {
    const url = new URL(fromUrl);
    const sslParam = url.searchParams.get('ssl') || url.searchParams.get('sslmode') || url.searchParams.get('ssl-mode');
    const requireSsl = !!(sslParam && /require|true|verify/i.test(sslParam));

    const cfg = {
      ...base,
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 3306,
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace(/^\//, '') || undefined
    };

    if (requireSsl || process.env.DB_SSL === 'true') {
      cfg.ssl = {
        minVersion: 'TLSv1.2'
      };
      // Pokud je potřeba ověřovat CA, můžeme dodat certifikát přes env
      if (process.env.DB_SSL_CA_PATH && fs.existsSync(process.env.DB_SSL_CA_PATH)) {
        cfg.ssl.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8');
      } else if (process.env.DB_SSL_CA) {
        cfg.ssl.ca = process.env.DB_SSL_CA;
      }
      // Aiven může vyžadovat CA verifikaci; pokud sslParam obsahuje VERIFY, zapneme rejectUnauthorized
      if (sslParam && /verify/i.test(sslParam)) {
        cfg.ssl.rejectUnauthorized = true;
      }
    }

    return cfg;
  }

  // Fallback na jednotlivé proměnné (lokální vývoj nebo Render s ručně nastavenými proměnnými)
  const cfg = {
    ...base,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'sketchwave'
  };

  if (process.env.DB_SSL === 'true') {
    cfg.ssl = { minVersion: 'TLSv1.2' };
    if (process.env.DB_SSL_CA_PATH && fs.existsSync(process.env.DB_SSL_CA_PATH)) {
      cfg.ssl.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8');
    } else if (process.env.DB_SSL_CA) {
      cfg.ssl.ca = process.env.DB_SSL_CA;
    }
    if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true') {
      cfg.ssl.rejectUnauthorized = true;
    }
  }

  return cfg;
}

const pool = mysql.createPool(buildDbConfig());

// Testování připojení
pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL databáze úspěšně připojena');
    connection.release();
  })
  .catch(err => {
    console.error('✗ Chyba připojení k MySQL databázi:', err.message);
  });

export default pool;
