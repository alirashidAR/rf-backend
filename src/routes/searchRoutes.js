import express from 'express';
import { searchProjects } from '../controllers/projectController.js';

const router = express.Router();

/**
 * @route POST /api/projects/search
 * @desc Search projects with filters, search term, pagination
 * @access Public or Protected based on your auth middleware
 */

router.post('/search/projects', searchProjects);

export default router;
