import prisma from "../prisma/prismaClient.js";
import jwt from "jsonwebtoken";

jest.mock("../prisma/prismaClient", () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

export { prisma, jwt };
