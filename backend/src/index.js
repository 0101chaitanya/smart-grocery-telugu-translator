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
import bcrypt from 'bcrypt';
import User from './models/User.js';

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
  .then(async () => {
    console.log('Successfully connected to local MongoDB instance');
    
    // Seed single Seller if not exists
    try {
      const sellerEmail = 'sellerUser1';
      let seller = await User.findOne({ role: 'seller' });
      const hashedPassword = await bcrypt.hash('sellerAdmin@123', 10);
      
      if (!seller) {
        seller = new User({
          name: 'Store Manager',
          email: sellerEmail,
          role: 'seller',
          password: hashedPassword,
          preferredLanguage: 'en'
        });
        await seller.save();
        console.log('Seeded the single Seller account successfully: sellerUser1 / sellerAdmin@123');
      } else {
        seller.email = sellerEmail;
        seller.password = hashedPassword;
        await seller.save();
        console.log('Updated Seller account credentials to: sellerUser1 / sellerAdmin@123');
      }
    } catch (seedErr) {
      console.error('Error seeding Seller account:', seedErr);
    }
  })
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
      sameSite: 'lax', // Lax is perfect since Vercel rewrite proxy makes all traffic first-party
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
