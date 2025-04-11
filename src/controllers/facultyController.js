import prisma from '../../prisma/prismaClient.js';

export const CreateFaculty = async (name,id) => {
    const faculty = await prisma.faculty.create({
        data:{
            title: name,
            userId: id,
            bio: "",
            researchAreas: [],
            contactInfo: "",
        }
    });
    return faculty;
}

export const getFacultyDetails = async (req,res) =>{
    const id = req.params.id;
    console.log(id);
    const faculty = await prisma.faculty.findFirst({
        where:{
            id:id
        },
        include:{
            user:true,
        }
    });

    if (faculty) {
        res.status(200).json(faculty);
    } else {
        res.status(404).json({ message: "Faculty not found" });
    }
}



export const updateDetails = async (req, res) => {
    const id = req.params.id;
    const {
        bio,
        researchAreas,
        contactInfo,
        title,
        phone,
        location,
        name // this is the user's name
    } = req.body;

    try {
        const updatedFaculty = await prisma.faculty.update({
            where: { id },
            data: {
                bio,
                researchAreas,
                contactInfo,
                title,
                phone,
                location,
                user: {
                    update: {
                        name,
                    },
                },
            },
            include: {
                user: true, 
            },
        });

        res.status(200).json(updatedFaculty);
    } catch (error) {
        console.error("Error updating faculty details:", error);
        res.status(500).json({ message: "Error updating faculty details" });
    }
};



export const searchFaculty = async (req, res) => {
    const { name } = req.query;

    try {
        const faculty = await prisma.faculty.findMany({
            where: {
                user: {
                    name: {
                        contains: name,
                        mode: 'insensitive', // makes the search case-insensitive
                    },
                },
            },
            include: {
                user: true,
            },
        });

        res.status(200).json(faculty);
    } catch (error) {
        console.error("Error searching faculty:", error);
        res.status(500).json({ message: "Error searching faculty" });
    }
};
