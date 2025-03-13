import googleAuth from '../middlewares/googleAuth.js';
import { login, googleLogin } from '../controllers/authController.js';
import express from 'express';

const router = express.Router();

router.post('/googleLogin', googleAuth, googleLogin);

export default router;