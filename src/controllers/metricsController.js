import prisma from '../../prisma/prismaClient.js';


export const getNumberOfSubmissions = async (req, res) => {
    try {
        const num = await prisma.submission.count();
        res.status(200).json({ count: num });
    } catch (error) {
        console.error('Error getting number of submissions:', error);
        res.status(500).json({ message: 'Failed to get number of submissions', error: error.message });
    }
};

export const getNumberOfProjects = async (req, res) => {
    try {
        const num = await prisma.project.count();
        res.status(200).json({ count: num });
    } catch (error) {
        console.error('Error getting number of projects:', error);
        res.status(500).json({ message: 'Failed to get number of projects', error: error.message });
    }
};

export const getNumberOfUsers = async (req, res) => {
    try {
        const num = await prisma.user.count();
        res.status(200).json({ count: num });
    } catch (error) {
        console.error('Error getting number of users:', error);
        res.status(500).json({ message: 'Failed to get number of users', error: error.message });
    }
};

export const getNumberOfFaculties = async (req, res) => {
    try {
        const num = await prisma.faculty.count();
        res.status(200).json({ count: num });
    } catch (error) {
        console.error('Error getting number of faculties:', error);
        res.status(500).json({ message: 'Failed to get number of faculties', error: error.message });
    }
};

export const getAllProjectsSortedByStatus = async (req, res) => {
    try {
        const projects = await prisma.project.groupBy({
            by: ['status'],
            _count: {
                status: true
            }
        });

        const result = projects.reduce((acc, project) => {
            acc[project.status] = project._count.status;
            return acc;
        }, {});

        res.status(200).json(result);
    } catch (error) {
        console.error('Error getting projects grouped by status:', error);
        res.status(500).json({ message: 'Failed to get projects grouped by status', error: error.message });
    }
};
