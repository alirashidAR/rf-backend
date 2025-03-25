import { login } from "../../src/controllers/authController.js";
import { prisma, jwt } from "../setup.js";

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

    it("should return 200 and a token on success", async () => {
      prisma.user.findUnique.mockResolvedValue({ email: "test@vit.ac.in", password: "123456" });
      jwt.sign.mockReturnValue("mocked_token");

      const req = { body: { email: "test@vit.ac.in", password: "123456" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ jwt: "mocked_token" });
    });
  });
});
