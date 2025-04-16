import { CreateFaculty,getFacultyDetails,searchFaculty,updateDetails } from '../controllers/facultyController.js';
import { Role } from '@prisma/client';
import verifyJWT from '../middlewares/verifyJwt.js';
import verifyRole from '../middlewares/verifyRole.js';
import express from 'express';

const router = express.Router();

router.post('/faculty',verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN]), CreateFaculty);
router.patch('/faculty/:id',verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN]), updateDetails);
router.get('/faculty/search',verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN,Role.USER]), searchFaculty);
router.get('/faculty/:id',verifyJWT, verifyRole([Role.FACULTY, Role.ADMIN,Role.USER]), getFacultyDetails);

export default router;