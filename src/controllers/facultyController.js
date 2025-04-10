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
        }
    });

    if (faculty) {
        res.status(200).json(faculty);
    } else {
        res.status(404).json({ message: "Faculty not found" });
    }
}