import prisma from '../../prisma/prismaClient.js';


export const getUser = async (req, res) => {
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id,
        },
    });

    res.status(200).json(user);
}

export const editUser = async (req, res) => {
    const user = await prisma.user.update({
        where: {
            id: req.user.id,
        },
        data: req.body,
    });

    res.status(200).json(user);
}


