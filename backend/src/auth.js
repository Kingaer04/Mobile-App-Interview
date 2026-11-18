const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET not set – using an insecure development secret.');
}

function signToken(user) {
  return jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

function readUser(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET);
    return { id: p.sub, name: p.name, email: p.email };
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid token is present; never rejects. */
function optionalAuth(req, _res, next) {
  req.user = readUser(req);
  next();
}

/** Rejects with 401 unless a valid token is present. */
function requireAuth(req, res, next) {
  req.user = readUser(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
}

module.exports = { signToken, optionalAuth, requireAuth };
