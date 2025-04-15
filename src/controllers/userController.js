import prisma from '../../prisma/prismaClient.js';


export const getUser = async (req, res) => {
    const user = await prisma.user.findUnique({
        where: {
            id: req.user.id,
        },
    });

    res.status(200).json(user);
}

export const getUserDetails = async (req, res) => {
    try {
        const id = req.params.id;

        const user = await prisma.user.findUnique({
            where: {
                id: id,
            },
            select: {
                name: true,
                profilePicUrl: true,
                bio: true,
                email: true,
                researchInterests: true,
                department: true,
                location: true,
                phone: true,
                projectsParticipated:{
                    select:{
                        project:{
                            select:{
                                id: true,
                                title: true,
                                description: true,
                                createdAt: true,
                                updatedAt: true,
                            }
                        }
                    }
                }
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user, contactInfo: user.email, bio: user.bio, researchAreas: user.researchInterests,phone:user.phone, location:user.location });
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateUser = async (req, res) => {
    const {name, contactInfo, bio, researchAreas,location,phone} = req.body;
    console.log(req.body);

    const user = await prisma.user.update({
        where: {
            id: req.user.id,
        },
        data: {
            location:location,
            phone:phone,
            name,
            email: contactInfo,
            bio,
            researchInterests:researchAreas,
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


export const fillUserDetails = async (req, res) => {
    // we use forms to fill user details, so get them
    const bio =  FormData.get('bio');
    const researchInterests = FormData.get('researchInterests');
    const department = FormData.get('department');
    const userId = req.user.id;

    const user = await prisma.user.update({
        where:{
            id: userId,
        },
        data:{
            bio: bio,
            researchInterests: researchInterests,
            department: department,
        },
    })

    res.status(200).json("User details updated successfully");
}

