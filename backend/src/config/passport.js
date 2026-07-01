import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Dynamically resolves to process.env.BACKEND_URL or falls back to localhost in development
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      scope: ['profile', 'email'],
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;
        const avatar = profile.photos[0]?.value;

        let user = await User.findOne({ email });

        if (user) {
          if (!user.googleId) {
            user.googleId = googleId;
            if (!user.avatar) user.avatar = avatar;
            await user.save();
          }
        } else {
          user = new User({
            name,
            email,
            googleId,
            avatar,
            preferredLanguage: 'en',
          });
          await user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize user ID into session storage
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user object from ID stored in session cookie
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
