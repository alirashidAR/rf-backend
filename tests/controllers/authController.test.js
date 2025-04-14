import { register, login, googleLogin } from '../../src/controllers/authController.js';
import { prisma, jwt, bcrypt } from '../setup.js';

jest.mock('../../src/controllers/facultyController.js', () => ({
  CreateFaculty: jest.fn().mockResolvedValue({ id: 123, name: 'Test Faculty' }),
}));

describe('Auth Controller Tests', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Register', () => {
    it('should return 400 if email or password is missing', async () => {
      req.body = { email: '', password: '' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('should return 403 for non-VIT emails', async () => {
      req.body = { email: 'user@gmail.com', password: 'pass123' };

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only VIT Faculty and Students can access this.' });
    });

    it('should return 409 if email already exists', async () => {
      req.body = { email: 'test@vit.ac.in', password: 'password123', name: 'Test User' };
      prisma.user.findUnique.mockResolvedValueOnce({ email: 'test@vit.ac.in' });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
    });

    it('should register and create faculty successfully', async () => {
      req.body = { email: 'faculty@vit.ac.in', password: 'password123', name: 'Faculty Name' };
      prisma.user.findUnique.mockResolvedValueOnce(null);
      bcrypt.hash.mockResolvedValueOnce('hashedPassword');
      prisma.user.create.mockResolvedValueOnce({ id: 1, email: req.body.email, role: 'FACULTY', name: req.body.name });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'User created successfully' });
    });
  });

  describe('Login', () => {
    it('should return 400 if email or password is missing', async () => {
      req.body = { email: '', password: '' };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    // it('should return 401 if credentials are invalid', async () => {
    //   req.body = { email: 'test@vit.ac.in', password: 'wrongPass' };
    //   prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: req.body.email, password: 'hashedPassword', role: 'FACULTY' });
    //   bcrypt.compare.mockResolvedValueOnce(false);

    //   await login(req, res);

    //   expect(res.status).toHaveBeenCalledWith(401);
    //   expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    // });

    it('should return 401 if faculty record not found', async () => {
      req.body = { email: 'faculty@vit.ac.in', password: 'correctPass' };
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: req.body.email, password: 'hashedPassword', role: 'FACULTY', name: 'Test Faculty' });
      bcrypt.compare.mockResolvedValueOnce(true);
      prisma.faculty.findUnique.mockResolvedValueOnce(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Faculty not found' });
    });

    it('should return 200 with JWT if credentials are valid', async () => {
      req.body = { email: 'faculty@vit.ac.in', password: 'correctPass' };
      prisma.user.findUnique.mockResolvedValueOnce({ id: 1, email: req.body.email, password: 'hashedPassword', role: 'FACULTY', name: 'Test Faculty' });
      bcrypt.compare.mockResolvedValueOnce(true);
      prisma.faculty.findUnique.mockResolvedValueOnce({ id: 101 });
      jwt.sign.mockReturnValueOnce('mocked-jwt-token');

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ jwt: 'mocked-jwt-token' });
    });
  });

  describe('Google Login', () => {
    it('should return 403 for non-VIT emails', async () => {
      req.user = { email: 'user@gmail.com', name: 'Random User' };

      await googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Only VIT Faculty and Students can access this.' });
    });

    it('should create new user and faculty on first login', async () => {
      req.user = { email: 'faculty@vit.ac.in', name: 'Faculty One', uid: 'firebase-uid-1' };
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 1, email: req.user.email, role: 'FACULTY', name: req.user.name });
      prisma.faculty.findUnique.mockResolvedValueOnce({ id: 100 });
      jwt.sign.mockReturnValueOnce('google-jwt-token');

      await googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ jwt: 'google-jwt-token' });
    });

    it('should return token for existing user', async () => {
      req.user = { email: 'student@vitstudent.ac.in', name: 'Student User', uid: 'firebase-uid-2' };
      prisma.user.findUnique.mockResolvedValueOnce({ id: 2, email: req.user.email, role: 'USER', name: req.user.name });
      jwt.sign.mockReturnValueOnce('existing-user-token');

      await googleLogin(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ jwt: 'existing-user-token' });
    });
  });
});
