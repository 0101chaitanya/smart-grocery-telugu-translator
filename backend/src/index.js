import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import mongoose from 'mongoose'; // Re-added

import './config/passport.js';
import itemsRouter from './routes/itemRoutes.js';
import authRouter from './routes/authRoutes.js';
import listRouter from './routes/listRoutes.js';
import orderRouter from './routes/orderRoutes.js';

dotenv.config();

const app = express();

// Configure CORS for Session Cookies
app.use(
  cors({
    origin: process.env.CLIENT_URL, // Frontend React
    credentials: true, // Crucial for cookies to transfer
  })
);

app.use(express.json());

// Establish MongoDB Connection (Re-added)
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to local MongoDB instance'))
  .catch((error) => console.error('MongoDB database connection error:', error));

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

if (isProduction) {
  app.set('trust proxy', 1); // Trust Vercel's proxy headers
}

// Set up Session Middleware with MongoDB persistence
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 'none' enables cross-domain cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/items', itemsRouter);
app.use('/api/lists', listRouter);
app.use('/api/orders', orderRouter);
app.get('/api/health', (req, res) => {
  res.json({
    status: 'active',
    message: 'Grocery API server is running smoothly',
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(process.env.PORT, () => {
    console.log(
      `Server executing successfully on http://localhost:${process.env.PORT}`
    );
  });
}

export default app;
