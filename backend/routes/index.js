import express from 'express';
import authRoutes from './auth.routes.js'; 
import userRoutes from './users.routes.js'; 
import interfaceRoutes from './interface.routes.js';

const router = express.Router();

// Define your top-level API routes
router.use('/auth', authRoutes); 
router.use('/users', userRoutes); 
router.use('/interfaces', interfaceRoutes); 

export default router;