// Middleware pro ověření, že je uživatel přihlášen
export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Middleware pro přesměrování přihlášených uživatelů
export function ensureGuest(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}
