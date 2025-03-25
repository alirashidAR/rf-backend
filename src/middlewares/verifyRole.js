import jwt from "jsonwebtoken";

const verifyRole = (allowedRoles) => (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!allowedRoles.includes(decoded.role)) {  
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Forbidden: Invalid or expired token" });
    }
};


export default verifyRole;
