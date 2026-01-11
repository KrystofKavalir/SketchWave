

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcrypt';
import passport from './auth.js';
import db from './db.js';
import { ensureAuthenticated, ensureGuest } from './middleware.js';

// Načtení .env (lokálně) a případně Secret File na Renderu
dotenv.config();
if (fs.existsSync('/etc/secrets/.env')) {
  dotenv.config({ path: '/etc/secrets/.env', override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = new Server(httpServer, { cors: { origin: '*' } });

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
const sessionMiddleware = session({
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
});

app.use(sessionMiddleware);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Sdílení session a Passportu do Socket.IO
const wrap = (mw) => (socket, next) => mw(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

// Helper pro ověření přístupu k tabuli (owner, board_access, nebo přátelé s ownerem)
async function hasBoardAccess(userId, boardId) {
  const [[ownerRow]] = await db.query('SELECT owner_id FROM board WHERE board_id = ?', [boardId]);
  if (!ownerRow) return false;
  const ownerId = ownerRow.owner_id;
  if (ownerId === userId) return true;
  const [acc] = await db.query('SELECT 1 FROM board_access WHERE board_id = ? AND user_id = ? LIMIT 1', [boardId, userId]);
  if (acc.length > 0) return true;
  const [fr] = await db.query(
    `SELECT 1 FROM friendship 
     WHERE ((user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)) 
       AND status = 'accepted' LIMIT 1`,
    [ownerId, userId, userId, ownerId]
  );
  return fr.length > 0;
}

// Helper: může uživatel zapisovat do tabule? (vlastník nebo role editor)
async function canEditBoard(userId, boardId) {
  const [[ownerRow]] = await db.query('SELECT owner_id FROM board WHERE board_id = ?', [boardId]);
  if (!ownerRow) return false;
  if (ownerRow.owner_id === userId) return true;
  const [acc] = await db.query('SELECT role FROM board_access WHERE board_id = ? AND user_id = ? LIMIT 1', [boardId, userId]);
  if (acc.length && acc[0].role === 'editor') return true;
  return false;
}

io.on('connection', (socket) => {
  const user = socket.request.user;
  // Join board room
  socket.on('board:join', async ({ boardId }) => {
    try {
      if (!user || !user.user_id) return socket.emit('board:error', { error: 'Nejste přihlášen.' });
      const bid = parseInt(boardId, 10);
      if (!Number.isFinite(bid)) return socket.emit('board:error', { error: 'Neplatné ID tabule.' });
      const ok = await hasBoardAccess(user.user_id, bid);
      if (!ok) return socket.emit('board:error', { error: 'Nemáte přístup k této tabuli.' });
      const room = `board:${bid}`;
      socket.join(room);
      socket.emit('board:joined', { boardId: bid });
    } catch (e) {
      console.error('board:join error', e);
      socket.emit('board:error', { error: 'Chyba při připojování k tabuli.' });
    }
  });

  // Drawing stream (point-by-point)
  socket.on('draw:point', ({ boardId, x, y, color, lineWidth }) => {
    const room = `board:${parseInt(boardId, 10)}`;
    if (!room) return;
    socket.to(room).emit('draw:point', { x, y, color, lineWidth, from: socket.id });
  });
  socket.on('draw:stroke:end', ({ boardId }) => {
    const room = `board:${parseInt(boardId, 10)}`;
    socket.to(room).emit('draw:stroke:end', { from: socket.id });
  });

  // Shape added
  socket.on('shape:add', ({ boardId, shape, x, y, w, h, color, lineWidth }) => {
    const room = `board:${parseInt(boardId, 10)}`;
    socket.to(room).emit('shape:add', { shape, x, y, w, h, color, lineWidth, from: socket.id });
  });

  // Text added
  socket.on('text:add', ({ boardId, x, y, text, color, fontSize }) => {
    const room = `board:${parseInt(boardId, 10)}`;
    socket.to(room).emit('text:add', { x, y, text, color, fontSize, from: socket.id });
  });

  // Board cleared
  socket.on('board:clear', ({ boardId }) => {
    const room = `board:${parseInt(boardId, 10)}`;
    socket.to(room).emit('board:clear');
  });

  // Board sync (undo/redo) - informovat ostatní uživatele
  socket.on('board:sync', ({ boardId }) => {
    const room = `board:${parseInt(boardId, 10)}`;
    socket.to(room).emit('board:sync');
  });

  socket.on('disconnect', () => {});
});

// Routes
// Health-check DB
app.get('/health/db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 as ok');
    res.json({ ok: true, result: rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
  }
});
// List boards for the logged-in user
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
          // Pro ostatní typy (rect, circle, line) uložíme lineWidth do content
          finalContent = JSON.stringify({ lineWidth: lineWidth || 4 });
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

// Autosave existující tabule (vlastník nebo editor)
app.post('/board/:id/autosave', ensureAuthenticated, async (req, res) => {
  const connection = db; // sdílený pool
  const boardId = parseInt(req.params.id, 10);
  if (!Number.isFinite(boardId)) return res.status(400).json({ success: false, error: 'Neplatné ID tabule.' });
  try {
    const editable = await canEditBoard(req.user.user_id, boardId);
    if (!editable) return res.status(403).json({ success: false, error: 'Nemáte právo upravovat tuto tabuli.' });

    const { objects, size_x, size_y } = req.body || {};
    if (!Array.isArray(objects)) return res.status(400).json({ success: false, error: 'Chybí data tabule.' });

    await connection.query('START TRANSACTION');

    // případná aktualizace velikosti tabule
    if (Number.isFinite(size_x) && Number.isFinite(size_y)) {
      await connection.query('UPDATE board SET size_x = ?, size_y = ?, updated_at = NOW() WHERE board_id = ?', [size_x, size_y, boardId]);
    }

    await connection.query('DELETE FROM canvas_object WHERE board_id = ?', [boardId]);

    for (const obj of objects) {
      const type = obj.type;
      if (!type) continue;
      const x = Number.isFinite(obj.x) ? obj.x : null;
      const y = Number.isFinite(obj.y) ? obj.y : null;
      const width = Number.isFinite(obj.width) ? obj.width : null;
      const height = Number.isFinite(obj.height) ? obj.height : null;
      const color = obj.color || null;
      let content = null;

      if (type === 'draw') {
        const points = Array.isArray(obj.points) ? obj.points : [];
        const lineWidth = obj.lineWidth || obj.width || obj.strokeWidth || 2;
        content = JSON.stringify({ points, lineWidth });
      } else if (type === 'text') {
        const text = obj.content && obj.content.text ? obj.content.text : (obj.text || obj.content || '');
        const fontSize = obj.content && obj.content.fontSize ? obj.content.fontSize : (obj.fontSize || 16);
        content = JSON.stringify({ text, fontSize });
      } else if (type === 'rect' || type === 'circle' || type === 'line') {
        // Uložit tloušťku čáry pro tvary do JSON content
        const lineWidth = obj.lineWidth || obj.strokeWidth || 4;
        content = JSON.stringify({ lineWidth });
      }

      await connection.query(
        'INSERT INTO canvas_object (board_id, created_by, type, x, y, width, height, color, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [boardId, req.user.user_id, type, x, y, width, height, color, content]
      );
    }

    await connection.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await connection.query('ROLLBACK');
    console.error('Autosave error:', err);
    res.status(500).json({ success: false, error: 'Chyba serveru při autosave.' });
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

// Seznam tabulí přihlášeného uživatele
app.get('/boards/my', ensureAuthenticated, async (req, res) => {
  try {
    const uid = req.user.user_id;
    const [rows] = await db.query(
      'SELECT board_id AS id, name, size_x, size_y, created_at FROM board WHERE owner_id = ? ORDER BY created_at DESC',
      [uid]
    );
    res.json({ boards: rows });
  } catch (err) {
    console.error('Chyba při načítání seznamu tabulí:', err);
    res.status(500).json({ error: 'Chyba serveru při načítání tabulí.' });
  }
});

// Seznam tabulí, kam má uživatel udělený přístup (board_access)
app.get('/boards/shared', ensureAuthenticated, async (req, res) => {
  try {
    const uid = req.user.user_id;
    const [rows] = await db.query(
      `SELECT b.board_id AS id, b.name, b.size_x, b.size_y, b.created_at,
              b.owner_id, u.name AS owner_name, ba.role
         FROM board_access ba
         JOIN board b ON b.board_id = ba.board_id
         JOIN user u ON u.user_id = b.owner_id
        WHERE ba.user_id = ?
        ORDER BY b.created_at DESC`,
      [uid]
    );
    res.json({ boards: rows });
  } catch (err) {
    console.error('Chyba při načítání sdílených tabulí:', err);
    res.status(500).json({ error: 'Chyba serveru při načítání sdílených tabulí.' });
  }
});

// Načtení konkrétní tabule (meta + objekty)
app.get('/board/:id', ensureAuthenticated, async (req, res) => {
  try {
    const uid = req.user.user_id;
    const boardId = parseInt(req.params.id, 10);
    if (Number.isNaN(boardId)) return res.status(400).json({ error: 'Neplatné ID tabule' });

    // Ověření přístupu: vlastník, board_access, nebo přátelství s ownerem
    const ok = await hasBoardAccess(uid, boardId);
    if (!ok) return res.status(403).json({ error: 'Nemáte přístup k této tabuli' });

    const [boards] = await db.query(
      'SELECT board_id AS id, name, size_x, size_y, description, is_public FROM board WHERE board_id = ?',
      [boardId]
    );
    if (boards.length === 0) return res.status(404).json({ error: 'Tabule nenalezena' });
    const board = boards[0];

    const [objects] = await db.query(
      'SELECT object_id AS id, type, x, y, width, height, color, content FROM canvas_object WHERE board_id = ? ORDER BY object_id ASC',
      [boardId]
    );

    res.json({ board, objects });
  } catch (err) {
    console.error('Chyba při načítání tabule:', err);
    res.status(500).json({ error: 'Chyba serveru při načítání tabule.' });
  }
});

// Pozvat uživatele do tabule (udělit přístup)
app.post('/board/:id/invite', ensureAuthenticated, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id, 10);
    if (!Number.isFinite(boardId)) return res.status(400).json({ success: false, error: 'Neplatné ID tabule.' });
    const { user_id, friend_id, role } = req.body; // přijmeme obě varianty z frontendu
    const targetId = parseInt(friend_id ?? user_id, 10);
    if (!Number.isFinite(targetId)) return res.status(400).json({ success: false, error: 'Neplatný uživatel.' });
    // jen vlastník může udělovat přístup
    const [[ownerRow]] = await db.query('SELECT owner_id FROM board WHERE board_id = ?', [boardId]);
    if (!ownerRow) return res.status(404).json({ success: false, error: 'Tabule nenalezena.' });
    if (ownerRow.owner_id !== req.user.user_id) return res.status(403).json({ success: false, error: 'Tuto tabuli nevlastníte.' });

    const theRole = role === 'viewer' ? 'viewer' : 'editor';
    // Vložit nebo ignorovat duplicitní
    const [existing] = await db.query('SELECT 1 FROM board_access WHERE board_id = ? AND user_id = ? LIMIT 1', [boardId, targetId]);
    if (existing.length === 0) {
      await db.query('INSERT INTO board_access (board_id, user_id, role, joined_at) VALUES (?, ?, ?, NOW())', [boardId, targetId, theRole]);
    } else {
      await db.query('UPDATE board_access SET role = ? WHERE board_id = ? AND user_id = ?', [theRole, boardId, targetId]);
    }
    res.json({ success: true });
  } catch (e) {
    console.error('board invite error', e);
    res.status(500).json({ success: false, error: 'Chyba serveru.' });
  }
});
// Přátelé: odeslat pozvánku
app.post('/friends/invite', ensureAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) return res.status(400).json({ success: false, error: 'Email je povinný.' });
    const [users] = await db.query('SELECT user_id FROM user WHERE email = ? LIMIT 1', [email.trim()]);
    if (users.length === 0) return res.status(404).json({ success: false, error: 'Uživatel s tímto emailem neexistuje.' });
    const targetId = users[0].user_id;
    const me = req.user.user_id;
    if (targetId === me) return res.status(400).json({ success: false, error: 'Nemůžete pozvat sám sebe.' });

    const a = Math.min(me, targetId);
    const b = Math.max(me, targetId);
    const [rows] = await db.query('SELECT * FROM friendship WHERE user_id1 = ? AND user_id2 = ? LIMIT 1', [a, b]);
    if (rows.length === 0) {
      await db.query('INSERT INTO friendship (user_id1, user_id2, status, action_user_id, created_at, updated_at) VALUES (?, ?, \'pending\', ?, NOW(), NOW())', [a, b, me]);
      return res.json({ success: true, message: 'Pozvánka odeslána.' });
    } else {
      const row = rows[0];
      if (row.status === 'accepted') return res.json({ success: true, message: 'Již jste přátelé.' });
      await db.query('UPDATE friendship SET status = \'pending\', action_user_id = ?, updated_at = NOW() WHERE friendship_id = ?', [me, row.friendship_id]);
      return res.json({ success: true, message: 'Pozvánka byla aktualizována.' });
    }
  } catch (e) {
    console.error('friends/invite error', e);
    res.status(500).json({ success: false, error: 'Chyba serveru.' });
  }
});

// Přátelé: čekající pozvánky pro mě
app.get('/friends/pending', ensureAuthenticated, async (req, res) => {
  try {
    const me = req.user.user_id;
    const [rows] = await db.query(
      `SELECT f.friendship_id, 
              CASE WHEN f.user_id1 = ? THEN f.user_id2 ELSE f.user_id1 END AS other_id,
              u.name AS other_name, u.email AS other_email
         FROM friendship f
         JOIN user u ON u.user_id = CASE WHEN f.user_id1 = ? THEN f.user_id2 ELSE f.user_id1 END
        WHERE (f.user_id1 = ? OR f.user_id2 = ?)
          AND f.status = 'pending'
          AND f.action_user_id <> ?
        ORDER BY f.created_at DESC`,
      [me, me, me, me, me]
    );
    res.json({ pending: rows });
  } catch (e) {
    console.error('friends/pending error', e);
    res.status(500).json({ error: 'Chyba serveru.' });
  }
});

// Přátelé: reakce na pozvánku (accept/decline)
app.post('/friends/respond', ensureAuthenticated, async (req, res) => {
  try {
    const me = req.user.user_id;
    const { other_id, action } = req.body;
    const otherId = parseInt(other_id, 10);
    if (!Number.isFinite(otherId)) return res.status(400).json({ success: false, error: 'Neplatný uživatel.' });
    const a = Math.min(me, otherId);
    const b = Math.max(me, otherId);
    const [rows] = await db.query('SELECT * FROM friendship WHERE user_id1 = ? AND user_id2 = ? LIMIT 1', [a, b]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Pozvánka nenalezena.' });
    const status = action === 'accept' ? 'accepted' : (action === 'decline' ? 'declined' : null);
    if (!status) return res.status(400).json({ success: false, error: 'Neplatná akce.' });
    await db.query('UPDATE friendship SET status = ?, action_user_id = ?, updated_at = NOW() WHERE friendship_id = ?', [status, me, rows[0].friendship_id]);
    res.json({ success: true });
  } catch (e) {
    console.error('friends/respond error', e);
    res.status(500).json({ success: false, error: 'Chyba serveru.' });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`SketchWave running at http://localhost:${PORT}`);
});
