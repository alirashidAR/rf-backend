import { login,googleLogin } from "../../src/controllers/authController.js";
import { prisma, jwt, bcrypt } from "../setup.js";

describe("Auth Controller", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should return 400 if email or password is missing", async () => {
      const req = { body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email and password are required" });
    });

    it("should return 401 if user is not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const req = { body: { email: "test@vit.ac.in", password: "123456" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
    });

    it("should return 401 if password is incorrect", async () => {
      prisma.user.findUnique.mockResolvedValue({
        email: "test@vit.ac.in",
        password: "hashed_password", // Assume this is a hashed password
      });

      bcrypt.compare.mockResolvedValue(false); // Simulate incorrect password

      const req = { body: { email: "test@vit.ac.in", password: "wrong_password" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid email or password" });
    });

    it("should return 200 and a JWT token on success", async () => {
      prisma.user.findUnique.mockResolvedValue({
        email: "test@vit.ac.in",
        password: "hashed_password",
      });

      bcrypt.compare.mockResolvedValue(true); // Simulate correct password
      jwt.sign.mockReturnValue("mocked_token"); // Mock JWT generation

      const req = { body: { email: "test@vit.ac.in", password: "123456" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await login(req, res);

      expect(jwt.sign).toHaveBeenCalledWith(
        { email: "test@vit.ac.in" },
        process.env.JWT_SECRET,
        { expiresIn: "7h" }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ jwt: "mocked_token" });
    });
  });
});


describe("Auth Controller - Google Login", () => {
  let req, res;

  beforeEach(() => {
    req = { user: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  it("should return 403 if the email is not from VIT", async () => {
    req.user = { email: "notvit@gmail.com", name: "Test User", uid: "someUID" };

    await googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Only VIT Faculty and Students can access this." });
  });

  it("should create a new user if not found and return a JWT", async () => {
    req.user = { email: "newuser@vitstudent.ac.in", name: "New Student", uid: "someUID" };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1, email: req.user.email, role: "USER", name: "New Student" });
    jwt.sign.mockReturnValue("mocked_token");

    await googleLogin(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: req.user.email } });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: req.user.email, role: "USER", name: "New Student", firebaseUid: "someUID" }
    });
    expect(jwt.sign).toHaveBeenCalledWith({ email: req.user.email, role: "USER", id: 1 }, process.env.JWT_SECRET, { expiresIn: "7h" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ jwt: "mocked_token" });
  });

  it("should return a JWT for an existing user", async () => {
    req.user = { email: "existing@vit.ac.in", name: "Existing Faculty", uid: "someUID" };

    prisma.user.findUnique.mockResolvedValue({ id: 2, email: req.user.email, role: "FACULTY", name: "Existing Faculty" });
    jwt.sign.mockReturnValue("mocked_token");

    await googleLogin(req, res);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: req.user.email } });
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalledWith({ email: req.user.email, role: "FACULTY", id: 2 }, process.env.JWT_SECRET, { expiresIn: "7h" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ jwt: "mocked_token" });
  });
});
