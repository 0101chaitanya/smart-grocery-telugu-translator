import express from 'express';
import User from '../models/User.js';
import passport from 'passport';

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// Same cookie options used to set the connect.sid session cookie must be used to clear it
const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/'
};

// 1. GET /api/auth/google - Trigger Google Consent redirect
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. GET /api/auth/google/callback - Receives redirect from Google
router.get(
  '/google/callback',
  (req, res, next) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    passport.authenticate('google', {
      failureRedirect: `${clientUrl}/?error=failed`,
    })(req, res, next);
  },
  (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/`);
  }
);

// 3. GET /api/auth/me - Check current authentication status
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// 4. POST /api/auth/logout - Invalidate Session and clear cookies
router.post('/logout', (req, res, next) => {
  if (typeof req.logout !== 'function') {
    res.clearCookie('connect.sid', clearCookieOptions);
    return res.json({ message: 'Passport not initialized, cleared session cookie' });
  }

  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      req.logout((err) => {
        if (err) {
          console.error("Passport logout callback error:", err);
          return next(err);
        }
        
        if (req.session) {
          req.session.destroy((sessionErr) => {
            if (sessionErr) {
              console.error("Express session destroy error:", sessionErr);
              return next(sessionErr);
            }
            res.clearCookie('connect.sid', clearCookieOptions);
            return res.json({ message: 'Logged out successfully' });
          });
        } else {
          res.clearCookie('connect.sid', clearCookieOptions);
          return res.json({ message: 'Logged out successfully' });
        }
      });
    } else {
      if (req.session) {
        req.session.destroy(() => {
          res.clearCookie('connect.sid', clearCookieOptions);
          return res.json({ message: 'Logged out and session cleared' });
        });
      } else {
        res.clearCookie('connect.sid', clearCookieOptions);
        return res.json({ message: 'Logged out and cookies cleared' });
      }
    }
  } catch (catchError) {
    console.warn("Synchronous logout fallback triggered:", catchError.message);
    try {
      req.logout();
      if (req.session) {
        req.session.destroy(() => {
          res.clearCookie('connect.sid', clearCookieOptions);
          return res.json({ message: 'Logged out successfully (sync fallback)' });
        });
      } else {
        res.clearCookie('connect.sid', clearCookieOptions);
        return res.json({ message: 'Logged out successfully (sync fallback)' });
      }
    } catch (innerError) {
      console.error("Logout failed completely:", innerError);
      res.clearCookie('connect.sid', clearCookieOptions);
      return res.status(500).json({ error: innerError.message });
    }
  }
});

export default router;
