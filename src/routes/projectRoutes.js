import express from 'express';
import verifyJwt from '../middlewares/verifyJwt.js';
import verifyRole from '../middlewares/verifyRole.js';
import { Role } from '@prisma/client';

import { 
    createProject, 
    updateProject, 
    deleteProject, 
    getAllProjects, 
    searchProjects, 
    getProjectById, 
    getFacultyProjects, 
    addToFavorites, 
    removeFromFavorites, 
    getProjectParticipants 
  } from '../controllers/projectController.js';

const router = express.Router();

// Project creation and management (FACULTY only)
router.post('/create', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), createProject);
router.put('/:id', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), updateProject);
router.delete('/:id', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), deleteProject);

// Project listing and search (accessible to all authenticated users)
router.get('/', verifyJwt, getAllProjects);
router.get('/search', verifyJwt, searchProjects);
router.get('/:id', verifyJwt, getProjectById);

// Faculty dashboard view of projects
router.get('/faculty/dashboard', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), getFacultyProjects);

// Add/remove project from favorites
router.post('/:id/favorite', verifyJwt, addToFavorites);
router.delete('/:id/favorite', verifyJwt, removeFromFavorites);

// Get project participants
router.get('/:id/participants', verifyJwt, getProjectParticipants);

export default router;
