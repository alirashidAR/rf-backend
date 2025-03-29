import prisma from '../../prisma/prismaClient.js';

// Create a new research project
export const createProject = async (req, res) => {
  try {
    const { title, description, keywords, type, startDate, endDate } = req.body;
    
    // Get faculty ID based on the logged-in user
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!faculty) {
      return res.status(403).json({ message: 'Faculty profile not found' });
    }
    
    const project = await prisma.project.create({
      data: {
        title,
        description,
        keywords,
        type,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        facultyId: faculty.id
      }
    });
    
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
};

// Update an existing project
export const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { title, description, keywords, type, startDate, endDate, status } = req.body;
    
    // Verify project belongs to the faculty
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project || project.facultyId !== faculty.id) {
      return res.status(403).json({ message: 'You do not have permission to update this project' });
    }
    
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        title,
        description,
        keywords,
        type,
        startDate: startDate ? new Date(startDate) : project.startDate,
        endDate: endDate ? new Date(endDate) : project.endDate,
        status: status || project.status
      }
    });
    
    res.json({ message: 'Project updated successfully', project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
};

// Delete a project
export const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Verify project belongs to the faculty
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project || project.facultyId !== faculty.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this project' });
    }
    
    await prisma.project.delete({
      where: { id: projectId }
    });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
};

// Get all projects (with optional filters)
export const getAllProjects = async (req, res) => {
  try {
    const { status, type, facultyId } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (facultyId) where.facultyId = facultyId;
    
    const projects = await prisma.project.findMany({
      where,
      include: {
        faculty: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                department: true,
                profilePicUrl: true
              }
            }
          }
        }
      }
    });
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
};

// Search projects
export const searchProjects = async (req, res) => {
  try {
    const { query, department, status, type, page = 1, pageSize = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Keyword (query) is required' });
    }

    const where = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { keywords: { has: query } }
      ]
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (department) {
      where.faculty = {
        user: {
          department: { equals: department, mode: 'insensitive' }
        }
      };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        faculty: {
          include: {
            user: {
              select: { name: true, email: true, department: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize)
    });

    res.json({ projects, currentPage: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (error) {
    console.error('Error searching projects:', error);
    res.status(500).json({ message: 'Failed to search projects', error: error.message });
  }
};

// Get project by ID
export const getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        faculty: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                department: true,
                profilePicUrl: true
              }
            }
          }
        },
        applications: {
          where: {
            userId: req.user.id
          },
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            applications: true,
            participants: true,
            favorited: true
          }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has favorited this project
    const isFavorite = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        favorites: {
          some: {
            id: projectId
          }
        }
      }
    });
    
    res.json({
      ...project,
      isFavorite: !!isFavorite
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
};

// Get faculty's projects for dashboard
export const getFacultyProjects = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!faculty) {
      return res.status(403).json({ message: 'Faculty profile not found' });
    }
    
    const projects = await prisma.project.findMany({
      where: { facultyId: faculty.id },
      include: {
        _count: {
          select: {
            applications: true,
            participants: true
          }
        },
        applications: {
          where: {
            status: 'PENDING'
          },
          select: {
            id: true
          }
        }
      }
    });
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching faculty projects:', error);
    res.status(500).json({ message: 'Failed to fetch faculty projects', error: error.message });
  }
};

// Add project to favorites
export const addToFavorites = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        favorites: {
          connect: { id: projectId }
        }
      }
    });
    
    res.json({ message: 'Project added to favorites' });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ message: 'Failed to add to favorites', error: error.message });
  }
};

// Remove project from favorites
export const removeFromFavorites = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        favorites: {
          disconnect: { id: projectId }
        }
      }
    });
    
    res.json({ message: 'Project removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ message: 'Failed to remove from favorites', error: error.message });
  }
};

// Get project participants
export const getProjectParticipants = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const participants = await prisma.projectParticipants.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicUrl: true,
            department: true
          }
        }
      }
    });
    
    res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ message: 'Failed to fetch participants', error: error.message });
  }
};