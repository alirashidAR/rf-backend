import { getUserDetails } from "../controllers/userController.js";
import { Role } from "@prisma/client";
import verifyJWT from "../middlewares/verifyJwt.js";
import verifyRole from "../middlewares/verifyRole.js";

import express from "express";


const router = express.Router();

// Get user details (for faculty and admin)
router.get("/user/:id", verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN]), getUserDetails);

export default router;