import admin from "../config/firebase.js";

export default async function googleAuth(req, res, next) {
    const header = req.headers.authorization;
    if(!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = header.split("Bearer ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next(); 
    }
    catch(error) {
        console.error(error);
        return res.status(401).json({ error: "Unauthorized" });
    }
}

