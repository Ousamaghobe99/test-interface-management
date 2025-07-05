// controllers/interface.controller.js

import { PrismaClient, InterfaceStatus } from '@prisma/client'; // Import PrismaClient and the InterfaceStatus enum
// If you're using the 'pkg' import style, it would be:
// import pkg from '@prisma/client';
// const { PrismaClient, InterfaceStatus } = pkg; // Destructure all needed enums/models

const prisma = new PrismaClient();

// --- Create Interface ---
export const createInterface = async (req, res) => {
  const { serialNumber, name, model, type, acquisitionDate, notes, currentLocationId } = req.body;

  // Basic validation
  if (!serialNumber || !name || !currentLocationId) {
    return res.status(400).json({ error: 'Serial number, name, and current location are required.' });
  }

  try {
    // Check if serial number already exists
    const existingInterface = await prisma.interface.findUnique({
      where: { serialNumber },
    });
    if (existingInterface) {
      return res.status(409).json({ error: 'Interface with this serial number already exists.' });
    }

    // Check if the currentLocationId exists
    const location = await prisma.location.findUnique({
      where: { id: currentLocationId },
    });
    if (!location) {
      return res.status(404).json({ error: 'Specified current location not found.' });
    }

    const newInterface = await prisma.interface.create({
      data: {
        serialNumber,
        name,
        model,
        type,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : undefined, // Convert to Date object if provided
        notes,
        currentLocation: {
          connect: { id: currentLocationId }, // Connect to existing location
        },
        status: InterfaceStatus.IN_STOCK, // Default status for new interfaces
      },
      include: {
        currentLocation: true, // Include location details in response
      },
    });

    res.status(201).json({
      message: 'Interface created successfully!',
      interface: newInterface,
    });
  } catch (error) {
    console.error('Error creating interface:', error);
    res.status(500).json({ error: 'Failed to create interface.', details: error.message });
  }
};

// --- Get All Interfaces ---
export const getAllInterfaces = async (req, res) => {
  try {
    const interfaces = await prisma.interface.findMany({
      include: {
        currentLocation: true,
      },
    });
    res.status(200).json(interfaces);
  } catch (error) {
    console.error('Error fetching interfaces:', error);
    res.status(500).json({ error: 'Failed to retrieve interfaces.', details: error.message });
  }
};

// --- Get Interface by ID ---
export const getInterfaceById = async (req, res) => {
  const { id } = req.params;
  try {
    const singleInterface = await prisma.interface.findUnique({
      where: { id },
      include: {
        currentLocation: true,
        movementLogs: {
            orderBy: { movedAt: 'desc' }, // Order logs by most recent
            include: { movedBy: { select: { id: true, firstName: true, lastName: true } } }
        },
        usageLogs: {
            orderBy: { loggedAt: 'desc' },
            include: { user: { select: { id: true, firstName: true, lastName: true } } }
        },
        maintenanceTickets: {
            orderBy: { createdAt: 'desc' },
            include: {
                reportedBy: { select: { id: true, firstName: true, lastName: true } },
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
            }
        }
      },
    });

    if (!singleInterface) {
      return res.status(404).json({ error: 'Interface not found.' });
    }
    res.status(200).json(singleInterface);
  } catch (error) {
    console.error(`Error fetching interface with ID ${id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve interface.', details: error.message });
  }
};

// --- Update Interface ---
export const updateInterface = async (req, res) => {
  const { id } = req.params;
  const { serialNumber, name, model, type, status, acquisitionDate, notes, currentLocationId } = req.body;

  try {
    const interfaceToUpdate = await prisma.interface.findUnique({
      where: { id },
    });

    if (!interfaceToUpdate) {
      return res.status(404).json({ error: 'Interface not found for update.' });
    }

    // If updating serial number, check for uniqueness
    if (serialNumber && serialNumber !== interfaceToUpdate.serialNumber) {
      const existingInterfaceWithNewSerial = await prisma.interface.findUnique({
        where: { serialNumber },
      });
      if (existingInterfaceWithNewSerial) {
        return res.status(409).json({ error: 'Another interface already uses this serial number.' });
      }
    }

    // If updating location, check if new location exists
    if (currentLocationId) {
      const location = await prisma.location.findUnique({
        where: { id: currentLocationId },
      });
      if (!location) {
        return res.status(404).json({ error: 'Specified new current location not found.' });
      }
    }

    const updatedInterface = await prisma.interface.update({
      where: { id },
      data: {
        serialNumber: serialNumber || interfaceToUpdate.serialNumber, // Use new value or keep old
        name: name || interfaceToUpdate.name,
        model: model, // Allow null/undefined to clear value
        type: type,   // Allow null/undefined to clear value
        status: status ? InterfaceStatus[status] : interfaceToUpdate.status, // Ensure enum value
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : acquisitionDate === null ? null : interfaceToUpdate.acquisitionDate, // Allow null to clear date
        notes: notes, // Allow null/undefined to clear value
        currentLocation: currentLocationId ? { connect: { id: currentLocationId } } : undefined,
      },
      include: {
        currentLocation: true,
      },
    });

    res.status(200).json({
      message: 'Interface updated successfully!',
      interface: updatedInterface,
    });
  } catch (error) {
    console.error(`Error updating interface with ID ${id}:`, error);
    res.status(500).json({ error: 'Failed to update interface.', details: error.message });
  }
};

// --- Delete Interface ---
// Note: Deleting an interface might require handling cascading deletes or nullifying
//       related records (movement logs, usage logs, maintenance tickets) depending on your schema.
//       Prisma will throw a foreign key error if related records exist and not configured for cascade/set null.
export const deleteInterface = async (req, res) => {
  const { id } = req.params;
  try {
    const interfaceToDelete = await prisma.interface.findUnique({
      where: { id },
    });

    if (!interfaceToDelete) {
      return res.status(404).json({ error: 'Interface not found for deletion.' });
    }

    // Optional: Implement soft delete by changing status to RETIRED or ARCHIVED instead
    // const retiredInterface = await prisma.interface.update({
    //     where: { id },
    //     data: { status: InterfaceStatus.RETIRED }
    // });
    // res.status(200).json({ message: 'Interface retired successfully!', interface: retiredInterface });


    // --- Before hard deleting, consider related records (MovementLogs, UsageLogs, MaintenanceTickets) ---
    // Depending on your schema, you might need to:
    // 1. Set `onDelete: Cascade` in your schema for relationships
    // 2. Or, manually delete/nullify related records here before deleting the interface:
    //    await prisma.interfaceMovementLog.deleteMany({ where: { interfaceId: id } });
    //    await prisma.usageLog.deleteMany({ where: { interfaceId: id } });
    //    await prisma.maintenanceTicket.deleteMany({ where: { interfaceId: id } });

    await prisma.interface.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Interface deleted successfully!' });
  } catch (error) {
    console.error(`Error deleting interface with ID ${id}:`, error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Interface not found for deletion.' });
    }
    // Handle foreign key constraint errors if not using cascade delete
    if (error.code === 'P2003') {
        return res.status(409).json({ error: 'Cannot delete interface due to existing related records. Please remove related movement logs, usage logs, or maintenance tickets first, or configure cascade deletes in schema.' });
    }
    res.status(500).json({ error: 'Failed to delete interface.', details: error.message });
  }
};