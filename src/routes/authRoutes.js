import googleAuth from '../middlewares/googleAuth.js';
import { login, register, googleLogin } from '../controllers/authController.js';
import express from 'express';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/googleLogin', googleAuth, googleLogin);

export default router;