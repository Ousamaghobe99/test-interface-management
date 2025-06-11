// routes/users.routes.js

import express from 'express';
// Controllers are one level up from 'routes', then into 'controllers'
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/users.controller.js';
// Middleware is one level up from 'routes', then into 'middleware'
import authMiddleware from '../middleware/auth.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middleware/authorize.middleware.js';

const router = express.Router();

// Admin-only route to create new user accounts
router.post(
  '/', // Will be accessible via /api/users
  authMiddleware,
  authorizeRoles(['Admin']),
  authorizePermissions(['manage_users']),
  createUser
);

// Protected routes for user management
router.get(
  '/', // Will be accessible via /api/users
  authMiddleware,
  authorizeRoles(['Admin']),
  authorizePermissions(['read_users']),
  getAllUsers
);

router.get(
  '/:id', // Will be accessible via /api/users/:id
  authMiddleware,
  authorizeRoles(['Admin', 'PreventiveTechnician', 'CorrectiveTechnician', 'User']),
  authorizePermissions(['read_users']),
  getUserById
);

router.put(
  '/:id', // Will be accessible via /api/users/:id
  authMiddleware,
  authorizeRoles(['Admin', 'PreventiveTechnician', 'CorrectiveTechnician', 'User']),
  authorizePermissions(['manage_users']),
  updateUser
);

router.delete(
  '/:id', // Will be accessible via /api/users/:id
  authMiddleware,
  authorizeRoles(['Admin']),
  authorizePermissions(['manage_users']),
  deleteUser
);

export default router;