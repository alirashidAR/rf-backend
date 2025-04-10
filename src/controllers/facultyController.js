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
