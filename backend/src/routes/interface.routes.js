// routes/interface.routes.js

import express from 'express';
import {
  createInterface,
  getAllInterfaces,
  getInterfaceById,
  updateInterface,
  deleteInterface,
} from '../controllers/interface.controller.js'; // Adjust path if needed
import authMiddleware from '../middleware/auth.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middleware/authorize.middleware.js';

const router = express.Router();

// Routes for Interface Management
// All these routes require authentication and specific permissions

// Create Interface (Admin or manager with 'manage_interfaces')
router.post(
  '/',
  authMiddleware,
  authorizeRoles(['Admin']), // Optional: only Admins can create. Or allow other roles.
  authorizePermissions(['manage_interfaces']),
  createInterface
);

// Get All Interfaces (Read access for multiple roles with 'read_interfaces')
router.get(
  '/',
  authMiddleware,
  authorizeRoles(['Admin', 'PreventiveTechnician', 'CorrectiveTechnician', 'User']),
  authorizePermissions(['read_interfaces']),
  getAllInterfaces
);

// Get Single Interface by ID (Read access for multiple roles with 'read_interfaces')
router.get(
  '/:id',
  authMiddleware,
  authorizeRoles(['Admin', 'PreventiveTechnician', 'CorrectiveTechnician', 'User']),
  authorizePermissions(['read_interfaces']),
  getInterfaceById
);

// Update Interface (Admin or manager with 'manage_interfaces')
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles(['Admin']), // Optional: only Admins can update. Or allow other roles.
  authorizePermissions(['manage_interfaces']),
  updateInterface
);

// Delete Interface (Admin or manager with 'manage_interfaces')
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles(['Admin']), // Optional: only Admins can delete.
  authorizePermissions(['manage_interfaces']),
  deleteInterface
);

export default router;