// src/controllers/users.controller.js

import pkg from '@prisma/client'; // Keep the pkg import style for PrismaClient
const { PrismaClient } = pkg;
// Note: If you use InterfaceStatus or other enums from @prisma/client in THIS file,
// ensure they are destructured from 'pkg' as well.
// For now, only PrismaClient is typically needed here.

import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken'; // No longer needed here
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
// const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key'; // No longer needed here

// This function will be called by an Admin to create new user accounts
export const createUser = async (req, res) => {
  const { matricule, email, password, firstName, lastName, phoneNumber, roleId } = req.body;

  if (!matricule || !email || !password || !firstName || !lastName || !phoneNumber || !roleId) {
    return res.status(400).json({ error: 'All fields are required to create a user account.' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        matricule,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        role: { connect: { id: roleId } }, // Connect to an existing role by ID
      },
      include: {
        role: true, // Include the role details in the response
      },
    });

    res.status(201).json({
      message: 'User account created successfully!',
      user: {
        id: newUser.id,
        matricule: newUser.matricule,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role.name,
      },
    });
  } catch (error) {
    console.error('Error during user account creation:', error);
    res.status(500).json({ error: 'Failed to create user account.', details: error.message });
  }
};

// loginUser function is removed from here and moved to authController.js

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        matricule: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Failed to retrieve users.', details: error.message });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  const requestingUserId = req.user.userId;
  const requestingUserRole = req.user.roleName;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        matricule: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (requestingUserRole !== 'Admin' && requestingUserId !== user.id) {
        return res.status(403).json({ status: "forbidden", message: "Access denied: You can only view your own profile." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve user.', details: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const requestingUserId = req.user.userId;
  const requestingUserRole = req.user.roleName;
  const { matricule, email, password, firstName, lastName, phoneNumber, roleId } = req.body;

  try {
    const userToUpdate = await prisma.user.findUnique({ where: { id } });

    if (!userToUpdate) {
        return res.status(404).json({ error: 'User not found for update.' });
    }

    if (requestingUserRole !== 'Admin' && requestingUserId !== id) {
        return res.status(403).json({ status: "forbidden", message: "Access denied: You can only update your own profile." });
    }

    if (requestingUserRole !== 'Admin' && roleId && roleId !== userToUpdate.roleId) {
        return res.status(403).json({ status: "forbidden", message: "Access denied: You cannot change your own role." });
    }

    let updateData = { firstName, lastName, phoneNumber };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (matricule) {
      updateData.matricule = matricule;
    }
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({ error: 'Email already in use by another user.' });
      }
      updateData.email = email;
    }
    if (requestingUserRole === 'Admin' && roleId) {
      updateData.role = { connect: { id: roleId } };
    }


    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    res.status(200).json({
      message: 'User updated successfully!',
      user: {
        id: updatedUser.id,
        matricule: updatedUser.matricule,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role.name,
      },
    });
  } catch (error) {
    console.error(`Error updating user with ID ${id}:`, error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found for update.' });
    }
    res.status(500).json({ error: 'Failed to update user.', details: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.userId === id) {
      return res.status(403).json({ status: "forbidden", message: "Access denied: You cannot delete your own account." });
    }

    await prisma.usageLog.updateMany({
        where: { userId: id },
        data: { userId: null }
    });
    await prisma.maintenanceTicket.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null }
    });
    await prisma.maintenanceLog.deleteMany({ where: { userId: id } });
    await prisma.interfaceMovementLog.deleteMany({ where: { movedById: id } });


    const deletedUser = await prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      }
    });

    res.status(200).json({ message: 'User deleted successfully!', user: deletedUser });
  } catch (error) {
    console.error(`Error deleting user with ID ${id}:`, error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found for deletion.' });
    }
    if (error.code === 'P2003') {
        console.error("Foreign key error details:", error.meta);
        return res.status(409).json({
            error: 'Cannot delete user due to existing required related records. Please reassign or delete related data first.',
            details: error.message
        });
    }
    res.status(500).json({ error: 'Failed to delete user.', details: error.message });
  }
};