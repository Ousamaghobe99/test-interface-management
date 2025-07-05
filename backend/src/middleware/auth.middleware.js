// middleware/auth.middleware.js

import pkg from '@prisma/client';
const { PrismaClient } = pkg; // PrismaClient is not used in this middleware, can remove this line if not needed here
// Remove PrismaClient import if you don't use it in this middleware
// import { PrismaClient } from '@prisma/client';

import JWT from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config(); // Ensure dotenv is configured to load .env variables

// Access JWT_SECRET from process.env, ensure it's loaded
const JWT_SECRET = process.env.JWT_SECRET;

// Add a check to ensure the secret is available for verification
if (!JWT_SECRET) {
  console.error("CRITICAL ERROR: JWT_SECRET is not defined in environment variables. JWT verification will fail.");
  // You might want to exit the process or throw an error here in production
}

const authMiddleware = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;

  // 1. Check if Authorization header exists and starts with Bearer
  if (!authHeader || !authHeader?.startsWith("Bearer")) {
    return res
      .status(401)
      .json({ status: "auth_failed", message: "Authentication failed: No token provided or malformed." });
  }

  // 2. Extract the token
  const token = authHeader?.split(" ")[1];

  try {
    // 3. Verify the token using the secret
    const userToken = JWT.verify(token, JWT_SECRET); // Use the JWT_SECRET constant

    // 4. ATTACH DECODED USER DATA TO `req.user` (NOT `req.body.user`)
    // This makes user data available to subsequent middleware and controllers
    req.user = {
      userId: userToken.userId,
      roleId: userToken.roleId, // Include roleId if it's in your token payload
      roleName: userToken.roleName, // Include roleName if it's in your token payload
    };

    // 5. Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message); // Log specific JWT error message
    // Handle different JWT errors specifically if needed (e.g., TokenExpiredError)
    return res
      .status(401)
      .json({ status: "auth_failed", message: "Authentication failed: Invalid token." });
  }
};

export default authMiddleware;