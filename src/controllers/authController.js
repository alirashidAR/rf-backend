import prisma from '../../prisma/prismaClient.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const register = async (req, res) => {
    const {email ,password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!email.endsWith("@vit.ac.in") && !(email.endsWith("@vitstudent.ac.in")|| email.endsWith("@vit.ac.in"))) {
        return res.status(403).json({ message: "Only VIT Faculty and Students can access this." });
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return res.status(409).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = email.endsWith("@vitstudent.ac.in") ? "USER" : "FACULTY";

    await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            role,
        },
    });

    res.status(201).json({ message: 'User created successfully' });
}


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
    
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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
