import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Vytvoření connection pool pro lepší výkon
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'sketchwave',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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
