import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Placeholder for future API endpoints
app.get('/api', (req, res) => {
  res.json({ 
    message: 'MeshSync API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
