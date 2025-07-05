// middleware/authorize.middleware.js

import { PrismaClient } from '@prisma/client'; // Import PrismaClient
// If you're using the 'pkg' import style, remember to use:
// import pkg from '@prisma/client';
// const { PrismaClient } = pkg;

const prisma = new PrismaClient(); // Initialize PrismaClient once

// authorizeRoles: Checks if the user has any of the required roles
export const authorizeRoles = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roleName) {
      return res.status(403).json({ status: "forbidden", message: "Access denied: Role information not available." });
    }

    if (!requiredRoles.includes(req.user.roleName)) {
      return res.status(403).json({ status: "forbidden", message: "Access denied: Insufficient role." });
    }
    next();
  };
};

// authorizePermissions: Checks if the user has all of the required permissions
export const authorizePermissions = (requiredPermissions) => {
  return async (req, res, next) => { // <-- Make this an async function
    // Ensure req.user and roleId are available from the token payload
    if (!req.user || !req.user.roleId) {
      return res.status(403).json({ status: "forbidden", message: "Access denied: User or role information missing from token." });
    }

    try {
      // Fetch the user's role with its associated permissions from the database
      const userRoleWithPermissions = await prisma.role.findUnique({
        where: { id: req.user.roleId }, // Use the roleId from the token
        include: {
          permissions: { // Include the RolePermission records
            select: {
              permission: { // Select the actual Permission details
                select: {
                  name: true // Just the name of the permission
                }
              }
            }
          }
        }
      });

      // If the role isn't found (highly unlikely if seeding works)
      if (!userRoleWithPermissions) {
        return res.status(403).json({ status: "forbidden", message: "Access denied: User's role not found in database." });
      }

      // Extract just the permission names into a simple array
      const userPermissions = userRoleWithPermissions.permissions.map(
        (rp) => rp.permission.name
      );

      // Check if the user has ALL required permissions
      const hasAllRequiredPermissions = requiredPermissions.every(
        (requiredPerm) => userPermissions.includes(requiredPerm)
      );

      if (hasAllRequiredPermissions) {
        // Optionally, you could attach these permissions to req.user for later use,
        // but it's not strictly necessary if you only need them for this check.
        // req.user.permissions = userPermissions;
        next(); // User has all permissions, proceed
      } else {
        return res.status(403).json({ status: "forbidden", message: "Access denied: Insufficient permissions." });
      }
    } catch (error) {
      console.error("Authorization error fetching permissions:", error);
      // More specific error for internal issues
      return res.status(500).json({ status: "error", message: "Internal server error during permission authorization." });
    }
  };
};