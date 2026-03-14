import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { isAuthenticated } from './middleware/auth.middleware';
import apiRoutes from './routes/api.routes';

dotenv.config();

const app = express();

app.get('/health', (req, res) => {
  res.json({ 
    message : "Backend is fine"
   });
});

app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: true,                    // reflects requesting origin (safer than *)
  credentials: true,               // must be true for cookies
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Set-Cookie'],  // if needed
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.get('/api/test', isAuthenticated, async (req, res) => {
  // If we reach here, the middleware validated the token
  console.log("Here is the response after test auth ", req.user);
  res.json({ 
    message: "Success! You are authenticated.", 
    user: req.user 
  });
});

// Routes
// Protected Route 
app.use('/api/auth', authRoutes);

app.use('/api', apiRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});