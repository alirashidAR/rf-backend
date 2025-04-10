import { CreateFaculty,getFacultyDetails,updateDetails } from '../controllers/facultyController.js';
import { Role } from '@prisma/client';
import verifyJWT from '../middlewares/verifyJwt.js';
import verifyRole from '../middlewares/verifyRole.js';
import express from 'express';

const router = express.Router();

router.post('/faculty',verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN]), CreateFaculty);
router.get('/faculty/:id',verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN]), getFacultyDetails);
router.patch('/faculty/:id',verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN]), updateDetails);

export default router;