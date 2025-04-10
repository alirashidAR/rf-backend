import prisma from '../../prisma/prismaClient.js';

// Create a new research project
export const createProject = async (req, res) => {
  try {
    const { title, description, keywords, type, status, startDate, endDate, applicationDeadline, positionsAvailable, location, requirements } = req.body;

    const validStatuses = ["ONGOING", "PENDING", "COMPLETED"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid project status" });
    }
    const validLocations = ["REMOTE", "ON_CAMPUS"];
    if (location && !validLocations.includes(location)) {
      return res.status(400).json({ message: "Invalid location type" });
    }

    // Get faculty ID from token
    const facultyId = req.user.facultyId;

    if (!facultyId) {
      return res.status(403).json({ message: 'Faculty ID not found in token' });
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        keywords,
        type,
        status: status || 'PENDING',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        applicationDeadline : applicationDeadline ? new Date(applicationDeadline) : null,
        positionsAvailable :  positionsAvailable || 0,
        location : location || 'ON_CAMPUS',
        requirements : requirements || [],
        facultyId: facultyId
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
    const { title, description, keywords, type, status, startDate, endDate, applicationDeadline, positionsAvailable, location, requirements } = req.body;
    
    // Verify project belongs to the faculty
    const facultyId = req.user.facultyId;
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.facultyId !== facultyId) {
      return res.status(403).json({ message: 'You do not have permission to update this project' });
    }
    
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        title,
        description,
        keywords,
        type,
        status: status || 'PENDING',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        applicationDeadline : applicationDeadline ? new Date(applicationDeadline) : null,
        positionsAvailable :  positionsAvailable || 0,
        location : location || 'ON_CAMPUS',
        requirements : requirements || [],
        facultyId: facultyId
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
    const facultyId = req.user.facultyId;
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project || project.facultyId !== facultyId) {
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

//Reove a student from the project
export const removeParticipant = async (req, res) => {
  try {
    const { projectId, studentId } = req.params;

    // Verify the faculty making the request
    const facultyId = req.user.facultyId;

    if (!facultyId) {
      return res.status(403).json({ message: "Faculty profile not found" });
    }

    // Check if the project exists and belongs to the faculty
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project || project.facultyId !== facultyId) {
      return res.status(403).json({ message: "You do not have permission to modify this project" });
    }

    // Check if the student is actually a participant
    const participant = await prisma.projectParticipants.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: studentId
        }
      }
    });

    if (!participant) {
      return res.status(404).json({ message: "Student is not a participant in this project" });
    }

    // Remove the student from the project
    await prisma.projectParticipants.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: studentId
        }
      }
    });

    res.json({ message: "Student removed from the project successfully" });
  } catch (error) {
    console.error("Error removing participant:", error);
    res.status(500).json({ message: "Failed to remove student", error: error.message });
  }
};

// Get all projects (with optional filters)
export const getAllProjects = async (req, res) => {
  try {
    const { status, type } = req.query;
    const facultyId = req.user.facultyId; // Get faculty ID from token
    if (!facultyId) {
      return res.status(403).json({ message: 'Faculty ID not found in token' });
    }
    
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
    const facultyId = req.user.facultyId;
    
    if (!facultyId) {
      return res.status(403).json({ message: 'Faculty profile not found' });
    }
    
    const projects = await prisma.project.findMany({
      where: { facultyId: facultyId },
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

export const getRecentProjects = async (req, res) => {
  try {
    const recentProjects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 10 // Fetch latest 10 projects
    });

    res.json({ projects: recentProjects });
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    res.status(500).json({ message: "Failed to fetch recent projects" });
  }
};

export const getCurrentProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's applied & accepted projects
    const applications = await prisma.application.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "ACCEPTED", "REJECTED"] } // Show only active applications
      },
      select: {
        project: {
          select: {
            id,
            title,
            updatedAt,
            status
          }
        },
        status
      }
    });

    // Remove projects with non-pending status after 2 days
    const currentDate = new Date();
    const filteredProjects = applications.filter(app => {
      if (app.status !== "PENDING") {
        const updatedDate = new Date(app.project.updatedAt);
        const diffInDays = (currentDate - updatedDate) / (1000 * 60 * 60 * 24);
        return diffInDays <= 2; // Keep if updated within last 2 days
      }
      return true;
    });

    res.json({ projects: filteredProjects });
  } catch (error) {
    console.error("Error fetching current projects:", error);
    res.status(500).json({ message: "Failed to fetch current projects" });
  }
};

export const getCurrentFacultyProjects = async (req, res) => {
  try {
    const facultyId = req.user.facultyId;

    if (!facultyId) {
      return res.status(403).json({ message: "Faculty profile not found" });
    }

    const facultyProjects = await prisma.project.findMany({
      where: {
        facultyId: facultyId
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        status: true,
        applications: {
          where: { status: "PENDING" },
          select: { id: true }
        }
      }
    });

    // Format the response to include pending application count
    const formattedProjects = facultyProjects.map(project => ({
      id: project.id,
      title: project.title,
      updatedAt: project.updatedAt,
      status: project.status,
      pendingApplications: project.applications.length // Count of pending applications
    }));

    res.json({ projects: formattedProjects });
  } catch (error) {
    console.error("Error fetching faculty projects:", error);
    res.status(500).json({ message: "Failed to fetch faculty projects" });
  }
};

export const getTrendingProjects = async (req, res) => {
  try {
    const trendingProjects = await prisma.project.findMany({
      orderBy: {
        applications: { _count: "desc" } // Sort by highest applications
      },
      take: 10, // Limit to top 10 projects
      include: {
        applications: true // Include applications count
      }
    });

    res.json({ projects: trendingProjects });
  } catch (error) {
    console.error("Error fetching trending projects:", error);
    res.status(500).json({ message: "Failed to fetch trending projects" });
  }
};

