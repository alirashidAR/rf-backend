import prisma from '../../prisma/prismaClient.js';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const user = await prisma.user.findUnique({
        where: {
        email,
        },
    });
    
    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7h' });
    
    res.status(200).json({ jwt: token });
};


export const googleLogin = async (req, res) => {
    const { email,name } = req.user;
    console.log(req.user);
    if (!email.endsWith("@vit.ac.in") && !email.endsWith("@vitstudent.ac.in")) {
        return res.status(403).json({ message: "Only VIT Faculty and Students can access this." });
    }

    const role = email.endsWith("@vitstudent.ac.in") ? "USER" : "FACULTY";

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        user = await prisma.user.create(
            { 
                data: 
                { 
                    email, 
                    role,
                    name:name,
                    firebaseUid: req.user.uid 
                } 
            }
        );
    }

    const token = jwt.sign({ email, role, id: user.id }, process.env.JWT_SECRET, { expiresIn: '7h' });

    res.status(200).json({ jwt:token });
};
