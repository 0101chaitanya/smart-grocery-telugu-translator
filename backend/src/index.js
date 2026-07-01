import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import itemsRouter from './routes/itemRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to local MongoDB instance'))
  .catch((error) => console.error('MongoDB database connection error:', error));

// Mount the items API
app.use('/api/items', itemsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'active',
    message: 'Grocery API server is running smoothly',
  });
});

app.listen(process.env.PORT, () => {
  console.log(
    `Server executing successfully on http://localhost:${process.env.PORT}`
  );
});
