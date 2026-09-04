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

export async function verifyLogin(email: string, password: string) {
  const employee = await prisma.commEmployee.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { department: { select: { id: true, receptionToken: true } } },
  });

  if (!employee || !employee.isActive) {
    return null;
  }

  const valid = await verifyPassword(password, employee.passwordHash);
  if (!valid) {
    return null;
  }

  // Reception desk capability: management roles always, or an employee whose
  // section (قسم) is reception-enabled (has a reception token configured).
  const deskAccess =
    employee.role === EmployeeRole.DIRECTOR ||
    employee.role === EmployeeRole.SECTION_MANAGER ||
    Boolean(employee.department?.receptionToken);

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phoneNumber: employee.phoneNumber ?? "",
    role: employee.role,
    departmentId: employee.departmentId ?? null,
    deskAccess,
  };
}

export async function createEmployee(params: {
  name: string;
  email: string;
  phoneNumber?: string | null;
  password: string;
  role?: EmployeeRole;
  departmentId?: string | null;
}) {
  const passwordHash = await hashPassword(params.password);
  const phone = params.phoneNumber?.trim() || null;
  const departmentId = params.departmentId?.trim() || null;
  return prisma.commEmployee.create({
    data: {
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      phoneNumber: phone,
      passwordHash,
      role: params.role ?? EmployeeRole.EMPLOYEE,
      departmentId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
}

export async function updateEmployee(
  id: string,
  params: {
    name?: string;
    email?: string;
    phoneNumber?: string | null;
    password?: string;
    role?: EmployeeRole;
    isActive?: boolean;
    departmentId?: string | null;
  },
) {
  const data: {
    name?: string;
    email?: string;
    phoneNumber?: string | null;
    passwordHash?: string;
    role?: EmployeeRole;
    isActive?: boolean;
    departmentId?: string | null;
  } = {};

  if (params.name !== undefined) data.name = params.name.trim();
  if (params.email !== undefined) data.email = params.email.trim().toLowerCase();
  if (params.phoneNumber !== undefined) {
    data.phoneNumber = params.phoneNumber?.trim() || null;
  }
  if (params.role !== undefined) data.role = params.role;
  if (params.isActive !== undefined) data.isActive = params.isActive;
  if (params.departmentId !== undefined) {
    data.departmentId = params.departmentId?.trim() || null;
  }
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
      departmentId: true,
      department: { select: { id: true, name: true } },
      updatedAt: true,
    },
  });
}
