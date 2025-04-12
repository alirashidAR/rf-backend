import express from 'express';
import verifyJwt from '../middlewares/verifyJwt.js';
import verifyRole from '../middlewares/verifyRole.js';
import { Role } from '@prisma/client';
const router = express.Router();
import { 
    getStudentProfile,
    updateApplicationStatus,
    getStudentApplications,
    getProjectApplications,
    getApplicationById,
    submitApplication,
    getAllApplicationsForFaculty
  } from '../controllers/applicationController.js';

// Submit application (Student only)
router.post('/project/apply/:projectId', verifyJwt, verifyRole([Role.USER]), submitApplication);

// View application details
router.get('/:id', verifyJwt, getApplicationById);

// Student's application history
router.get('/student/applications', verifyJwt, verifyRole([Role.USER]), getStudentApplications);

// Faculty application management
router.get('/project/:projectId/', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), getProjectApplications);
router.get('/all/:facultyId/', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), getAllApplicationsForFaculty);
router.put('/:id/status', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), updateApplicationStatus);

// View student profile from application (for faculty review)
router.get('/:id/student-profile', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), getStudentProfile);

export default router;
