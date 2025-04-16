import { getAllProjectsSortedByStatus, getNumberOfFaculties,getNumberOfProjects,getNumberOfSubmissions,getNumberOfUsers } from "../controllers/metricsController.js";
import express from "express";
import verifyJWT from "../middlewares/verifyJwt.js";
import verifyRole from "../middlewares/verifyRole.js";
import { Role } from "@prisma/client";

const router = express.Router();


router.get("/metrics/submissions", verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN,Role.USER]), getNumberOfSubmissions);
router.get("/metrics/projects", verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN,Role.USER]), getNumberOfProjects);
router.get("/metrics/users", verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN,Role.USER]), getNumberOfUsers);
router.get("/metrics/faculties", verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN,Role.USER]), getNumberOfFaculties);
router.get("/metrics/projects/status", verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN,Role.USER]), getAllProjectsSortedByStatus);


export default router;