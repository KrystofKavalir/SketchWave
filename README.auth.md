# SketchWave - Nastavení databáze a autentizace

## ✅ Hotovo

Databáze a autentizace byly úspěšně nakonfigurovány! 

### Co bylo nastaveno:

1. **Databázové připojení** - Aplikace se připojuje k MySQL databázi běžící v Dockeru
2. **Session management** - Sessions se ukládají do MySQL
3. **Lokální autentizace** - Registrace a přihlášení pomocí emailu a hesla
4. **Google OAuth** - Připraveno pro přihlášení přes Google účet
5. **Middleware ochrany** - Chráněné routes pro přihlášené uživatele

## 🔧 Konfigurace Google OAuth

Pro aktivaci Google přihlášení postupujte následovně:

### 1. Vytvoření Google Cloud projektu

1. Jděte na [Google Cloud Console](https://console.cloud.google.com/)
2. Vytvořte nový projekt nebo vyberte existující
3. V levém menu zvolte **APIs & Services** > **Credentials**

### 2. Konfigurace OAuth consent screen

1. Klikněte na **OAuth consent screen**
2. Vyberte **External** a klikněte **CREATE**
3. Vyplňte požadované informace:
   - App name: `SketchWave`
   - User support email: váš email
   - Developer contact information: váš email
4. Klikněte **SAVE AND CONTINUE**
5. Na stránce Scopes klikněte **ADD OR REMOVE SCOPES**
6. Vyberte:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Klikněte **SAVE AND CONTINUE**
8. Přidejte testovací uživatele (své emaily)
9. Klikněte **SAVE AND CONTINUE**

### 3. Vytvoření OAuth 2.0 Client ID

1. V **Credentials** klikněte **+ CREATE CREDENTIALS**
2. Vyberte **OAuth client ID**
3. Application type: **Web application**
4. Name: `SketchWave Web Client`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   ```
6. **Authorized redirect URIs:**
   ```
   http://localhost:3000/auth/google/callback
   ```
7. Klikněte **CREATE**
8. Zkopírujte **Client ID** a **Client Secret**

### 4. Aktualizace .env souboru

Otevřete soubor `.env` a aktualizujte tyto řádky:

```env
GOOGLE_CLIENT_ID=váš-client-id-zde
GOOGLE_CLIENT_SECRET=váš-client-secret-zde
```

## 🚀 Spuštění aplikace

```bash
# Ujistěte se, že Docker kontejnery běží
docker-compose up -d

# Spusťte aplikaci
npm start
```

Aplikace poběží na: http://localhost:3000

## 📊 Přístup k databázi

- **phpMyAdmin**: http://localhost:8080
  - Server: `db`
  - Uživatel: `root`
  - Heslo: `1234`

## 🔐 Funkce autentizace

### Registrace (`/register`)
- Vyplnění formuláře s username, emailem a heslem
- Heslo je automaticky hashováno pomocí bcrypt
- Po registraci přesměrování na přihlášení

### Přihlášení (`/login`)
- Lokální přihlášení emailem a heslem
- Google OAuth přihlášení (po konfiguraci)
- Session platná 7 dní

### Profil (`/profile`)
- Přístupný pouze pro přihlášené uživatele
- Úprava username, emailu a bio
- Změna hesla (pro lokální účty)
- Zobrazení informací o účtu

### Odhlášení (`/logout`)
- Zničení session
- Přesměrování na hlavní stránku

## 📁 Struktura souborů

```
SketchWave/
├── .env                    # Konfigurační proměnné (NEPŘIDÁVAT DO GIT!)
├── server.js              # Hlavní server s routes
├── db.js                  # Databázové připojení
├── auth.js                # Passport.js konfigurace
├── middleware.js          # Auth middleware
├── Views/
│   ├── login.ejs         # Přihlašovací stránka
│   ├── register.ejs      # Registrační stránka
│   ├── profil.ejs        # Profilová stránka
│   └── main.ejs          # Hlavní aplikace
└── docker-compose.yml     # Docker konfigurace
```

## 🛡️ Bezpečnost

- Hesla jsou hashována pomocí bcrypt (10 rounds)
- Sessions jsou uloženy v MySQL (ne v paměti)
- CSRF ochrana přes express-session
- Middleware ochrana pro autentizované routes
- Google OAuth pro bezpečné přihlášení bez ukládání hesel

## ⚠️ Důležité poznámky

1. **Nikdy nepřidávejte `.env` do git!** (je již v `.gitignore`)
2. Pro produkci změňte `SESSION_SECRET` na silný náhodný řetězec
3. V produkci nastavte `NODE_ENV=production`
4. Pro produkci přidejte HTTPS a nastavte `cookie.secure: true`
5. Google OAuth v produkci vyžaduje HTTPS a ověřenou doménu

## 🐛 Řešení problémů

### Databáze se nepřipojí
```bash
# Zkontrolujte běžící kontejnery
docker ps

# Restartujte databázi
docker-compose restart db
```

### Session nefunguje
- Zkontrolujte, že v databázi existuje tabulka `sessions`
- Tabulka se vytvoří automaticky při prvním spuštění

### Google OAuth nefunguje
- Ověřte, že máte správně vyplněné `GOOGLE_CLIENT_ID` a `GOOGLE_CLIENT_SECRET`
- Zkontrolujte redirect URI v Google Console
- Ujistěte se, že jste přidali testovací uživatele

## 📝 TODO pro produkci

- [ ] Nastavit HTTPS
- [ ] Změnit SESSION_SECRET
- [ ] Implementovat CSRF ochranu
- [ ] Přidat rate limiting
- [ ] Implementovat email verifikaci
- [ ] Přidat "zapomenuté heslo" funkcionalitu
- [ ] Nastavit Google OAuth pro produkční doménu
