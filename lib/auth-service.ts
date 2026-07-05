import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { EmployeeRole } from "../generated/prisma/client";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function verifyLogin(phoneNumber: string, password: string) {
  const employee = await prisma.commEmployee.findUnique({
    where: { phoneNumber },
  });

  if (!employee || !employee.isActive) {
    return null;
  }

  const valid = await verifyPassword(password, employee.passwordHash);
  if (!valid) {
    return null;
  }

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phoneNumber: employee.phoneNumber,
    role: employee.role,
  };
}

export async function createEmployee(params: {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  role?: EmployeeRole;
}) {
  const passwordHash = await hashPassword(params.password);
  return prisma.commEmployee.create({
    data: {
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      phoneNumber: params.phoneNumber.trim(),
      passwordHash,
      role: params.role ?? EmployeeRole.EMPLOYEE,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function updateEmployee(
  id: string,
  params: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    role?: EmployeeRole;
    isActive?: boolean;
  },
) {
  const data: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    passwordHash?: string;
    role?: EmployeeRole;
    isActive?: boolean;
  } = {};

  if (params.name !== undefined) data.name = params.name.trim();
  if (params.email !== undefined) data.email = params.email.trim().toLowerCase();
  if (params.phoneNumber !== undefined) data.phoneNumber = params.phoneNumber.trim();
  if (params.role !== undefined) data.role = params.role;
  if (params.isActive !== undefined) data.isActive = params.isActive;
  if (params.password) data.passwordHash = await hashPassword(params.password);

  return prisma.commEmployee.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });
}
