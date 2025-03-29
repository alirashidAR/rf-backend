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

export const fillFacultyDetails = async (req, res) => {
    // we use forms to fill user details, so get them
    const bio =  FormData.get('bio');
    const facultyId = FormData.get('facultyId');
    const facultyPublications = FormData.get('facultyPublications');
    const publications = JSON.parse(FormData.get('publications'));
    const department = FormData.get('department');
    const userId = req.user.id;
    
    for (const publication of publications) {
        await prisma.publication.create({
            data: {
                title: publication.title,
                authors: publication.authors,
                journal: publication.journal,
                conference: publication.conference,
                year: publication.year,
                url: publication.url,
                facultyId: publication.facultyId,
            },
        });
    }

    await prisma.user.update({
        where:{
            id: userId,
        },
        data:{
            bio: bio,
            facultyId: facultyId,
            facultyPublications: facultyPublications,
            department: department,
        },
    })

    res.status(200).json("User details updated successfully");
}