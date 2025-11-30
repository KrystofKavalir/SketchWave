import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import db from './db.js';
import dotenv from 'dotenv';

dotenv.config();

// Serializace uživatele do session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserializace uživatele ze session
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM user WHERE user_id = ?', [id]);
    if (rows.length > 0) {
      done(null, rows[0]);
    } else {
      done(new Error('Uživatel nenalezen'), null);
    }
  } catch (err) {
    done(err, null);
  }
});

// Lokální strategie (email + heslo)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      return done(null, false, { message: 'Nesprávný email nebo heslo' });
    }
    
    const user = rows[0];
    
    // Kontrola hesla
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return done(null, false, { message: 'Nesprávný email nebo heslo' });
    }
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Google OAuth strategie
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Zkusit najít uživatele s Google ID
    let [rows] = await db.query('SELECT * FROM user WHERE google_id = ?', [profile.id]);
    
    if (rows.length > 0) {
      // Uživatel již existuje
      return done(null, rows[0]);
    }
    
    // Zkusit najít uživatele podle emailu
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    
    if (email) {
      [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
      
      if (rows.length > 0) {
        // Propojit existující účet s Google
        await db.query('UPDATE user SET google_id = ? WHERE user_id = ?', [profile.id, rows[0].user_id]);
        rows[0].google_id = profile.id;
        return done(null, rows[0]);
      }
    }
    
    // Vytvořit nového uživatele
    const username = profile.displayName || email?.split('@')[0] || `user${Date.now()}`;
    const about = profile._json.bio || null;
    
    const [result] = await db.query(
      'INSERT INTO user (name, email, google_id, about, created_at) VALUES (?, ?, ?, ?, NOW())',
      [username, email, profile.id, about]
    );
    
    const newUser = {
      user_id: result.insertId,
      name: username,
      email,
      google_id: profile.id,
      about,
      role: 'user'
    };
    
    return done(null, newUser);
  } catch (err) {
    return done(err);
  }
}));

export default passport;
