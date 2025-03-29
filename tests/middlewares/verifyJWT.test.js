import verifyJWT from "../../src/middlewares/verifyJwt.js";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("verifyJWT Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("should return 401 if no token is provided", () => {
    verifyJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized: Missing or invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if the token is invalid", () => {
    req.headers.authorization = "Bearer invalid_token";
    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    verifyJWT(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() if the token is valid", () => {
    req.headers.authorization = "Bearer valid_token";
    const decodedUser = { id: 1, email: "test@vit.ac.in" };
    jwt.verify.mockReturnValue(decodedUser);

    verifyJWT(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("valid_token", process.env.JWT_SECRET);
    expect(req.user).toEqual(decodedUser);
    expect(next).toHaveBeenCalled();
  });
});
