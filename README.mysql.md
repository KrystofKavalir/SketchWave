# MySQL a phpMyAdmin v Dockeru

## 🚀 Spuštění

```bash
# Spuštění všech služeb (web, MySQL, phpMyAdmin)
docker-compose up -d

# Sledování logů
docker-compose logs -f

# Zastavení služeb
docker-compose down

# Zastavení a smazání databázových dat
docker-compose down -v
```

## 📊 Přístup k databázi

### phpMyAdmin
- URL: **http://localhost:8080**
- Server: `db`
- Uživatel: `root`
- Heslo: `1234`

Alternativně můžete použít:
- Uživatel: `sketchwave_user`
- Heslo: `sketchwave123`

### MySQL přímé připojení
```bash
# Z hostitelského stroje
mysql -h 127.0.0.1 -P 3306 -u root -p
# heslo: 1234

# Z Docker kontejneru
docker exec -it sketchwave_mysql mysql -u root -p
```

### Připojení z Node.js aplikace
```javascript
// Uvnitř Docker kontejneru
host: 'db'
port: 3306
user: 'root'
password: '1234'
database: 'sketchwave'

// Z lokálního vývoje (bez Dockeru)
host: 'localhost'
port: 3306
user: 'root'
password: '1234'
database: 'sketchwave'
```

## 🗄️ Databáze a uživatelé

### Vytvořené databáze
- `sketchwave` - hlavní databáze aplikace

### Vytvořené uživatele
- **root** / `1234` - plný přístup
- **sketchwave_user** / `sketchwave123` - aplikační uživatel s omezenými právy

## 📦 Persistentní data

Data MySQL jsou uložena v Docker volume `mysql_data`, což znamená, že:
- Data zůstanou zachována i po `docker-compose down`
- Pro smazání dat použijte `docker-compose down -v`
- Pro zálohu můžete použít:
  ```bash
  docker exec sketchwave_mysql mysqldump -u root -p1234 sketchwave > backup.sql
  ```

## 🔧 Užitečné příkazy

```bash
# Restart pouze MySQL
docker-compose restart db

# Restart pouze phpMyAdmin
docker-compose restart phpmyadmin

# Zobrazit běžící kontejnery
docker-compose ps

# Import SQL souboru
docker exec -i sketchwave_mysql mysql -u root -p1234 sketchwave < database.sql

# Export databáze
docker exec sketchwave_mysql mysqldump -u root -p1234 sketchwave > backup.sql
```

## 🛠️ Připojení MySQL driveru do Node.js

Pro připojení k MySQL z aplikace nainstalujte:

```bash
npm install mysql2
```

Příklad použití:
```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'sketchwave',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test připojení
try {
  const connection = await pool.getConnection();
  console.log('✅ MySQL connected');
  connection.release();
} catch (err) {
  console.error('❌ MySQL connection error:', err);
}
```

## 🔒 Poznámky k bezpečnosti

**⚠️ DŮLEŽITÉ:**
- Heslo `1234` je pouze pro vývoj/testování
- Pro produkci změňte všechna hesla v `docker-compose.yml`
- Nikdy necommitujte soubor `.env` s produkčními hesly do Gitu
- V produkci použijte silná hesla a omezená oprávnění uživatelů
