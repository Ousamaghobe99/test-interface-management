// src/routes/auth.routes.js

import express from 'express';
import { signinUser } from '../controllers/authController.js'; // Correct path to the new controller

const router = express.Router();
router.post("/sign-in", signinUser); // The public login endpoint

export default router;