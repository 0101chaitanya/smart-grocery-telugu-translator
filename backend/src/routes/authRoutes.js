import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import passport from 'passport';

const router = express.Router();

// Helper to generate a short-lived Access Token (15 mins)
const generateAccessToken = (userId) => {
  const secret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret_key_123';
  return jwt.sign({ id: userId }, secret, { expiresIn: '15m' });
};

// Helper to generate a long-lived Refresh Token (7 days)
const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_456';
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

// 1. POST /api/auth/register - User Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, preferredLanguage } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ error: 'An account with this email already exists' });
    }

    const user = new User({ name, email, password, preferredLanguage });

    // Generate both tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user record in DB
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/auth/login - User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate both tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/auth/refresh - Refresh Access Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    const secret =
      process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_456';

    // Verify refresh token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret);
    } catch (err) {
      return res
        .status(403)
        .json({ error: 'Invalid or expired refresh token' });
    }

    // Find user and verify the token matches the one stored in DB
    const user = await User.findOne({ _id: decoded.id, refreshToken });
    if (!user) {
      return res
        .status(403)
        .json({ error: 'User session not found or revoked' });
    }

    // Issue a brand-new short-lived access token
    const newAccessToken = generateAccessToken(user._id);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/auth/logout - Invalidate Session
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res
        .status(400)
        .json({ error: 'Refresh token is required to log out' });
    }

    // Locate user with this token and clear it to revoke access
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = '';
      await user.save();
    }

    res.json({ message: 'Successfully logged out, session revoked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. GET /api/auth/google - Trigger Google Consent redirect
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. GET /api/auth/google/callback - Receives redirect from Google
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:5173/auth?error=failed',
  }),
  (req, res) => {
    // Session cookie is automatically set on the browser. Redirect back to React SPA
    res.redirect('http://localhost:5173/');
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

// 4. POST /api/auth/logout - Invalidate Session
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    // Destroy express session in MongoDB
    req.session.destroy(() => {
      res.clearCookie('connect.sid'); // default express-session cookie name
      res.json({ message: 'Logged out successfully' });
    });
  });
});

export default router;
