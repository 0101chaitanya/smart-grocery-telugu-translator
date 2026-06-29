import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

// 1. Initialize environment variables
dotenv.config();

// 2. Setup the Express App instance
const app = express();

// 3. Apply Global Middlewares
app.use(cors()); // Allows your React app on port 5173 to connect securely
app.use(express.json()); // Enables your server to parse incoming JSON payloads in request bodies

// 4. Establish MongoDB Connection

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to local MongoDB instance'))
  .catch((error) => console.error('MongoDB database connection error:', error));

// 5. A Simple Health-Check Route (For testing your configuration)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'active',
    message: 'Grocery API server is running smoothly',
  });
});

// 6. Bind Server Instance to Network Port
app.listen(process.env.PORT, () => {
  console.log(
    `Server executing successfully on http://localhost:${process.env.PORT}`
  );
});
