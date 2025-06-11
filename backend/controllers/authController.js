// src/controllers/authController.js

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Use a strong, environment-specific key

export const signinUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }, // Include role for token payload
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, roleId: user.roleId, roleName: user.role.name }, // Include role for auth checks
      JWT_SECRET,
      { expiresIn: '1h' } // Token expiration
    );

    res.status(200).json({
      message: 'Login successful!',
      user: {
        id: user.id,
        matricule: user.matricule,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
      token,
    });
  } catch (error) {
    console.error('Error during user sign-in:', error);
    res.status(500).json({ error: 'Failed to sign in.', details: error.message });
  }
};