import express from 'express';
import { searchProjects } from '../controllers/projectController.js';
const router = express.Router();

router.post('/search/projects', searchProjects);

export default router;
