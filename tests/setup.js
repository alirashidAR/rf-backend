import prisma from "../prisma/prismaClient.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { configDotenv } from "dotenv";

configDotenv();

jest.mock("../prisma/prismaClient", () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  faculty: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("jsonwebtoken");
jest.mock("bcrypt");

bcrypt.compare = jest.fn();  
jwt.sign = jest.fn();   

export { prisma, jwt, bcrypt };
