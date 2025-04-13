import express from 'express';
import verifyJwt from '../middlewares/verifyJwt.js';
import verifyRole from '../middlewares/verifyRole.js';
import { Role } from '@prisma/client';
import multer from 'multer';

import { 
    createSubmission,
    updateSubmission,
    deleteSubmission,
    getProjectSubmissions,
    getSubmission,
    submitItem,
    provideFeedback
  } from '../controllers/submissionController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Faculty can create, update, and delete submissions
router.post('/', verifyJwt, verifyRole([Role.FACULTY]), createSubmission);
router.put('/:submissionId', verifyJwt, verifyRole([Role.FACULTY]), updateSubmission);
router.delete('/:submissionId', verifyJwt, verifyRole([Role.FACULTY]), deleteSubmission);

// Both faculty and students can get submissions
router.get('/project/:projectId', verifyJwt, getProjectSubmissions);
router.get('/:submissionId', verifyJwt, getSubmission);

// Students can submit items
router.post('/:submissionId/submit', 
  verifyJwt, 
  upload.single('file'), 
  submitItem
);

// Faculty can provide feedback
router.put('/item/:submissionItemId/feedback', 
  verifyJwt, 
  verifyRole([Role.FACULTY]), 
  provideFeedback
);

export default router;