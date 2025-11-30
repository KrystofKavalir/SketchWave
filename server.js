

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import passport from './auth.js';
import db from './db.js';
import { ensureAuthenticated, ensureGuest } from './middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.IO scaffold – ready for later real-time features
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', socket => {
  // Placeholder for future events (draw, text, shape, etc.)
  socket.on('disconnect', () => {});
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session store v MySQL
const MySQLSessionStore = MySQLStore(session);
const sessionStore = new MySQLSessionStore({
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, db);

// Session middleware
app.use(session({
  key: 'sketchwave_session',
  secret: process.env.SESSION_SECRET || 'your-super-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dní
    httpOnly: true,
    secure: false // HTTP (development), změnit na true pro HTTPS (production)
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', async (req, res) => {
  try {
    if (req.user) {
      const uid = req.user.user_id;
      const [friends] = await db.query(
        `SELECT 
           CASE WHEN f.user_id1 = ? THEN f.user_id2 ELSE f.user_id1 END AS friend_id,
           u.name AS friend_name,
           u.email AS friend_email
         FROM friendship f
         JOIN user u ON u.user_id = CASE WHEN f.user_id1 = ? THEN f.user_id2 ELSE f.user_id1 END
         WHERE (f.user_id1 = ? OR f.user_id2 = ?) AND f.status = 'accepted'
         ORDER BY u.name ASC`,
        [uid, uid, uid, uid]
      );
      return res.render('main', { user: req.user, friends });
    }
    res.render('main', { user: null, friends: [] });
  } catch (err) {
    console.error('Chyba při načítání přátel pro hlavní stránku:', err);
    res.render('main', { user: req.user || null, friends: [] });
  }
});

app.get('/register', ensureGuest, (req, res) => {
  res.render('register');
});

app.post('/register', ensureGuest, async (req, res) => {
  try {
    const { username, email, password, passwordConfirm } = req.body;
    
    // Validace
    if (!username || !email || !password || !passwordConfirm) {
      return res.status(400).send('Všechna pole jsou povinná');
    }
    
    if (password !== passwordConfirm) {
      return res.status(400).send('Hesla se neshodují');
    }
    
    if (password.length < 8) {
      return res.status(400).send('Heslo musí mít alespoň 8 znaků');
    }
    
    // Kontrola, zda email již neexistuje
    const [existing] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).send('Email je již registrován');
    }
    
    // Hash hesla
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Vytvoření uživatele
    await db.query(
      'INSERT INTO user (name, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [username, email, passwordHash]
    );
    
    res.redirect('/login');
  } catch (err) {
    console.error('Chyba při registraci:', err);
    res.status(500).send('Chyba serveru');
  }
});

app.get('/login', ensureGuest, (req, res) => {
  res.render('login');
});

app.post('/login', ensureGuest, (req, res, next) => {
  console.log('Login attempt for:', req.body.email);
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return next(err);
    }
    if (!user) {
      console.log('Login failed:', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Session error:', err);
        return next(err);
      }
      console.log('Login successful for user:', user.name);
      return res.redirect('/');
    });
  })(req, res, next);
});

// Google OAuth routes
app.get('/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Profil včetně seznamu přátel z tabulky `friendship`
app.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const uid = req.user.user_id;
    const [friends] = await db.query(
      `SELECT 
         CASE WHEN f.user_id1 = ? THEN f.user_id2 ELSE f.user_id1 END AS friend_id,
         u.name AS friend_name,
         u.email AS friend_email,
         f.status,
         f.created_at
       FROM friendship f
       JOIN user u ON u.user_id = CASE WHEN f.user_id1 = ? THEN f.user_id2 ELSE f.user_id1 END
       WHERE (f.user_id1 = ? OR f.user_id2 = ?) AND f.status = 'accepted'
       ORDER BY u.name ASC`,
      [uid, uid, uid, uid]
    );
    res.render('profil', { user: req.user, friends });
  } catch (err) {
    console.error('Chyba při načítání přátel:', err);
    res.render('profil', { user: req.user, friends: [] });
  }
});

app.post('/profile/update', ensureAuthenticated, async (req, res) => {
  try {
    const { username, email, bio } = req.body;
    
    if (!username || !email) {
      return res.status(400).send('Jméno a email jsou povinné');
    }
    
    // Kontrola, zda email není již použit jiným uživatelem
    const [existing] = await db.query(
      'SELECT * FROM user WHERE email = ? AND user_id != ?',
      [email, req.user.user_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).send('Email je již používán jiným uživatelem');
    }
    
    // Aktualizace profilu
    await db.query(
      'UPDATE user SET name = ?, email = ?, about = ? WHERE user_id = ?',
      [username, email, bio || null, req.user.user_id]
    );
    
    res.redirect('/profile');
  } catch (err) {
    console.error('Chyba při aktualizaci profilu:', err);
    res.status(500).send('Chyba serveru');
  }
});

app.post('/profile/change-password', ensureAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).send('Všechna pole jsou povinná');
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).send('Nová hesla se neshodují');
    }
    
    if (newPassword.length < 8) {
      return res.status(400).send('Heslo musí mít alespoň 8 znaků');
    }
    
    // Kontrola současného hesla
    const [rows] = await db.query('SELECT password FROM user WHERE user_id = ?', [req.user.user_id]);
    
    if (rows.length === 0 || !rows[0].password) {
      return res.status(400).send('Nelze změnit heslo pro účet přihlášený přes Google');
    }
    
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    
    if (!isMatch) {
      return res.status(400).send('Současné heslo je nesprávné');
    }
    
    // Hash nového hesla
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Aktualizace hesla
    await db.query(
      'UPDATE user SET password = ? WHERE user_id = ?',
      [newPasswordHash, req.user.user_id]
    );
    
    res.redirect('/profile');
  } catch (err) {
    console.error('Chyba při změně hesla:', err);
    res.status(500).send('Chyba serveru');
  }
});

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Chyba při odhlášení:', err);
    }
    res.redirect('/');
  });
});

// Uložit celou tabuli včetně všech objektů
app.post('/board/save-full', ensureAuthenticated, async (req, res) => {
  try {
    const { name, size_x, size_y, objects } = req.body;
    
    // Vytvoříme název, pokud není zadán
    let boardName = name && name.trim() ? name.trim() : null;
    if (!boardName) {
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      boardName = `tabule_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    }
    
    // Uložíme board
    const [boardResult] = await db.query(
      'INSERT INTO board (owner_id, name, size_x, size_y, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [req.user.user_id, boardName, size_x || 1280, size_y || 720]
    );
    const boardId = boardResult.insertId;
    
    // Uložíme všechny objekty
    if (objects && Array.isArray(objects) && objects.length > 0) {
      for (const obj of objects) {
        // obj může být: {type, x, y, width, height, color, lineWidth, fontSize, content, points}
        const { type, x, y, width, height, color, content, lineWidth, fontSize, points } = obj;
        
        let finalContent = null;
        
        if (type === 'draw' && points && Array.isArray(points)) {
          // Pro volné kreslení uložíme body a lineWidth jako JSON do content
          finalContent = JSON.stringify({points: points, lineWidth: lineWidth || 4});
        } else if (type === 'text' && content) {
          // Pro text uložíme text a fontSize jako JSON do content
          finalContent = JSON.stringify({text: content, fontSize: fontSize || 16});
        } else {
          // Pro ostatní typy (rect, circle, line) content zůstává null
          finalContent = content || null;
        }
        
        await db.query(
          'INSERT INTO canvas_object (board_id, created_by, type, x, y, width, height, color, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [boardId, req.user.user_id, type, x || null, y || null, width || null, height || null, color || null, finalContent]
        );
      }
    }
    
    res.json({ success: true, board_id: boardId, name: boardName });
  } catch (err) {
    console.error('Chyba při ukládání tabule:', err);
    res.status(500).json({ success: false, error: 'Chyba serveru při ukládání tabule.' });
  }
});

// Uložit tabuli (pouze pro přihlášené)
app.post('/board/save', ensureAuthenticated, async (req, res) => {
  try {
    let { name, description, is_public, size_x, size_y } = req.body;
    if (!name || !name.trim()) {
      // Pokud není název, použijeme default
      const now = new Date();
      const pad = n => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      name = `tabule_${dateStr}`;
    }
    // Výchozí hodnoty
    description = description || null;
    is_public = is_public === '1' || is_public === 1 ? 1 : 0;
    size_x = Number(size_x) || 1280;
    size_y = Number(size_y) || 720;
    // Vložení do DB
    const [result] = await db.query(
      'INSERT INTO board (owner_id, name, description, is_public, size_x, size_y, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [req.user.user_id, name, description, is_public, size_x, size_y]
    );
    return res.json({ success: true, board_id: result.insertId, name });
  } catch (err) {
    console.error('Chyba při ukládání tabule:', err);
    res.status(500).json({ success: false, error: 'Chyba serveru při ukládání tabule.' });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`SketchWave running at http://localhost:${PORT}`);
});
