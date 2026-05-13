import dotenv from "dotenv";
dotenv.config();

import app from './app.js';
import { connectDb } from './config/db.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDb();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on port ${PORT}`);
      console.log(`MongoDB connected successfully`);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();