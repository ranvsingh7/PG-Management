import 'dotenv/config';
import app from './app.js';
import { connectDb } from './config/db.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
      console.log(`MongoDB connected successfully`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
