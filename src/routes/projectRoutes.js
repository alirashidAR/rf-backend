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
    getProjectParticipants,
    removeParticipant,
    getRecentProjects,
    getCurrentProjects,
    getCurrentFacultyProjects,
    getTrendingProjects
  } from '../controllers/projectController.js';

const router = express.Router();



// Faculty dashboard view of projects
router.get('/faculty/current', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), getCurrentFacultyProjects);
router.get('/faculty', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), getFacultyProjects);
router.get('/current', verifyJwt, verifyRole([Role.USER, Role.ADMIN]), getCurrentProjects);
router.get('/recent', verifyJwt, getRecentProjects);
router.get('/trending', verifyJwt, getTrendingProjects);

// Project creation and management (FACULTY only)
router.post('/create', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), createProject);
router.put('/:id', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), updateProject);
router.delete('/:id', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), deleteProject);

// Project listing and search (accessible to all authenticated users)
router.get('/search', verifyJwt, searchProjects);
router.get('/', verifyJwt, getAllProjects);

// Add/remove project from favorites
router.post('/:id/favorite', verifyJwt, addToFavorites);
router.delete('/:id/favorite', verifyJwt, removeFromFavorites);

// Get project participants
router.get('/:id/participants', verifyJwt, getProjectParticipants);
router.delete('/:id/participants/:userId', verifyJwt, verifyRole([Role.FACULTY, Role.ADMIN]), removeParticipant);

// avoid conflicts
router.get('/:id', verifyJwt, getProjectById);


export default router;
