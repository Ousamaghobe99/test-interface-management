// prisma/seed.js

// Change this line:
// import { PrismaClient, InterfaceStatus, MovementReason, MaintenanceType, MaintenanceStatus, PriorityStatus } from '@prisma/client';

// To these lines:
import pkg from '@prisma/client';
const { PrismaClient, InterfaceStatus, MovementReason, MaintenanceType, MaintenanceStatus, PriorityStatus } = pkg;

import bcrypt from 'bcrypt'; // Keep this as is if using 'bcrypt'

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding Permissions, Roles (including new technician types), and Users...');

  // --- Seed Permissions ---
  const permissionsToCreate = [
    { name: 'read_users', description: 'Allows viewing user information' },
    { name: 'manage_users', description: 'Allows creating, updating, and deleting users' },
    { name: 'read_interfaces', description: 'Allows viewing interface details' },
    { name: 'manage_interfaces', description: 'Allows adding, modifying, and retiring interfaces' },
    { name: 'track_movements', description: 'Allows logging interface movements' },
    { name: 'report_maintenance', description: 'Allows creating maintenance tickets' },
    { name: 'assign_maintenance', description: 'Allows assigning maintenance tickets to technicians' },
    { name: 'resolve_maintenance', description: 'Allows resolving and closing maintenance tickets' },
    { name: 'view_usage_logs', description: 'Allows viewing interface usage history' },
    { name: 'manage_roles_permissions', description: 'Allows creating and managing roles and permissions' },
    // Specific permissions for different technician types
    { name: 'manage_daily_app_use', description: 'Allows managing daily application usage' }, // For Preventive
    { name: 'prepare_series_change', description: 'Allows preparing interfaces for series changes' }, // For Preventive
    { name: 'perform_interface_swap', description: 'Allows taking out and putting back interfaces for corrective actions' }, // For Corrective
    { name: 'leave_maintenance_remark', description: 'Allows leaving remarks on maintenance logs/tickets' }, // For Corrective
  ];

  const createdPermissions = {};
  for (const permData of permissionsToCreate) {
    const permission = await prisma.permission.upsert({
      where: { name: permData.name },
      update: {},
      create: permData,
    });
    createdPermissions[permission.name] = permission;
    console.log(`Created permission: ${permission.name}`);
  }

  // --- Seed Roles ---
  const rolesData = [
    {
      name: 'Admin',
      description: 'Full administrative access',
      permissions: [
        createdPermissions.read_users,
        createdPermissions.manage_users,
        createdPermissions.read_interfaces,
        createdPermissions.manage_interfaces,
        createdPermissions.track_movements,
        createdPermissions.report_maintenance,
        createdPermissions.assign_maintenance,
        createdPermissions.resolve_maintenance,
        createdPermissions.view_usage_logs,
        createdPermissions.manage_roles_permissions,
        createdPermissions.manage_daily_app_use,       // Admins can do everything
        createdPermissions.prepare_series_change,
        createdPermissions.perform_interface_swap,
        createdPermissions.leave_maintenance_remark,
      ],
    },
    {
      name: 'PreventiveTechnician',
      description: 'Manages daily app use and prepares series changes',
      permissions: [
        createdPermissions.read_interfaces,
        createdPermissions.track_movements, // Might need this for daily use tracking
        createdPermissions.report_maintenance, // Can report issues they find
        createdPermissions.view_usage_logs,
        createdPermissions.manage_daily_app_use,
        createdPermissions.prepare_series_change,
      ],
    },
    {
      name: 'CorrectiveTechnician',
      description: 'Handles interface swaps and leaves remarks for corrective actions',
      permissions: [
        createdPermissions.read_interfaces,
        createdPermissions.track_movements, // Needed for logging interface ins/outs
        createdPermissions.report_maintenance, // Can report issues they find
        createdPermissions.resolve_maintenance, // If they fix it, they resolve it
        createdPermissions.view_usage_logs, // To understand historical context
        createdPermissions.perform_interface_swap,
        createdPermissions.leave_maintenance_remark,
      ],
    },
    {
      name: 'User',
      description: 'Basic access for logging usage and reporting issues',
      permissions: [
        createdPermissions.read_interfaces,
        createdPermissions.report_maintenance,
        createdPermissions.view_usage_logs,
      ],
    },
  ];

  const createdRoles = {};
  for (const roleData of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });
    createdRoles[role.name] = role;
    console.log(`Created role: ${role.name}`);

    for (const permission of roleData.permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
      console.log(`  - Linked permission '${permission.name}' to role '${role.name}'`);
    }
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@labtrack.com' },
    update: {},
    create: {
      matricule: 'ADM001',
      email: 'admin@labtrack.com',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '21655123456',
      roleId: createdRoles.Admin.id,
    },
  });
  console.log(`Created Admin user: ${adminUser.email}`);

  const preventiveTechUser = await prisma.user.upsert({
    where: { email: 'preventive.tech@labtrack.com' },
    update: {},
    create: {
      matricule: 'PRE001',
      email: 'preventive.tech@labtrack.com',
      password: passwordHash,
      firstName: 'Omar',
      lastName: 'Preventif',
      phoneNumber: '21655666777',
      roleId: createdRoles.PreventiveTechnician.id,
    },
  });
  console.log(`Created Preventive Technician user: ${preventiveTechUser.email}`);

  const correctiveTechUser = await prisma.user.upsert({
    where: { email: 'corrective.tech@labtrack.com' },
    update: {},
    create: {
      matricule: 'CUR001',
      email: 'corrective.tech@labtrack.com',
      password: passwordHash,
      firstName: 'Fatma',
      lastName: 'Curatif',
      phoneNumber: '21655999000',
      roleId: createdRoles.CorrectiveTechnician.id,
    },
  });
  console.log(`Created Corrective Technician user: ${correctiveTechUser.email}`);

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@labtrack.com' },
    update: {},
    create: {
      matricule: 'USR001',
      email: 'user@labtrack.com',
      password: passwordHash,
      firstName: 'Regular',
      lastName: 'Member',
      phoneNumber: '21655987654',
      roleId: createdRoles.User.id,
    },
  });
  console.log(`Created Regular user: ${regularUser.email}`);

  // --- Seed Locations for Interfaces ---
  const storageLocation = await prisma.location.upsert({
    where: { name: 'Storage Room A' },
    update: {},
    create: {
      name: 'Storage Room A',
      description: 'Main storage for unused interfaces',
      address: 'Building 1, Floor 2',
    },
  });
  console.log(`Created location: ${storageLocation.name}`);

  // --- Add an Interface ---
  console.log('\n--- Demonstrating Add Interface ---');
  const newInterface = await prisma.interface.create({
    data: {
      interfaceName: 'Digital Multimeter DMM-500',
      serialNumber: 5001,
      description: 'Precision multimeter for voltage, current, resistance',
      type: 'Multimeter',
      status: InterfaceStatus.Available,
      currentLocationId: storageLocation.id,
      qrCodeData: 'qr-dmm-500-5001',
    },
  });
  console.log(`Added new interface: ${newInterface.interfaceName} (ID: ${newInterface.id})`);

  // --- Add another Interface for later deletion example ---
  const interfaceToDelete = await prisma.interface.create({
    data: {
      interfaceName: 'Old Power Supply PSU-100',
      serialNumber: 100,
      description: 'An older power supply to be disposed of.',
      type: 'Power Supply',
      status: InterfaceStatus.Retired,
      currentLocationId: storageLocation.id,
      qrCodeData: 'qr-psu-100-retired',
    },
  });
  console.log(`Added interface for deletion: ${interfaceToDelete.interfaceName} (ID: ${interfaceToDelete.id})`);

  // --- Add a New User ---
  console.log('\n--- Demonstrating Add User ---');
  const anotherUser = await prisma.user.create({
    data: {
      matricule: 'SUP001',
      email: 'support@labtrack.com',
      password: await bcrypt.hash('supportpass', 10),
      firstName: 'Help',
      lastName: 'Desk',
      phoneNumber: '21655777888',
      roleId: createdRoles.User.id,
    },
  });
  console.log(`Added new user: ${anotherUser.email} (ID: ${anotherUser.id})`);


  // --- Delete an Interface ---
  console.log('\n--- Demonstrating Delete Interface ---');
  try {
    await prisma.interfaceMovementLog.deleteMany({
        where: { interfaceId: interfaceToDelete.id }
    });
    await prisma.maintenanceTicket.deleteMany({
        where: { interfaceId: interfaceToDelete.id }
    });
    await prisma.maintenanceLog.deleteMany({
        where: { ticket: { interfaceId: interfaceToDelete.id } }
    });
    await prisma.usageLog.deleteMany({
        where: { interfaceId: interfaceToDelete.id }
    });


    const deletedInterface = await prisma.interface.delete({
      where: { id: interfaceToDelete.id },
    });
    console.log(`Deleted interface: ${deletedInterface.interfaceName} (ID: ${deletedInterface.id})`);
  } catch (error) {
    console.error(`Failed to delete interface ${interfaceToDelete.interfaceName}:`, error.message);
    console.warn('NOTE: If deletion fails, ensure all dependent records (e.g., usage logs, maintenance tickets, movement logs) referencing this interface are deleted first, or update the interface status to "Disposed" instead of physical deletion.');
  }

  console.log('\nSeeding and CRUD demonstration finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });