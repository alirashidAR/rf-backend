import prisma from '../../prisma/prismaClient.js';
import { ProjectStatus, ProjectType, Location } from '@prisma/client';

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

    // Convert dates to Date objects
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;
    const currentDate = new Date();

    // Validate dates based on project status
    if (status === 'COMPLETED') {
      if (!endDateObj || endDateObj > currentDate) {
        return res.status(400).json({ message: 'For completed projects, end date must be set and not be in the future' });
      }
    } else if (status === 'ONGOING') {
      if (!startDateObj || startDateObj > currentDate) {
        return res.status(400).json({ message: 'For ongoing projects, start date must be set and be in the past' });
      }
      if (!endDateObj || endDateObj <= currentDate) {
        return res.status(400).json({ message: 'For ongoing projects, end date must be set and be in the future' });
      }
    } else if (status === 'PENDING') {
      if (!startDateObj || startDateObj <= currentDate) {
        return res.status(400).json({ message: 'For pending projects, start date must be set and be in the future' });
      }
    }

    // Validate that start date is before end date
    if (startDateObj && endDateObj && startDateObj >= endDateObj) {
      return res.status(400).json({ message: 'Start date must be before end date' });
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        keywords,
        type,
        status: status || 'PENDING',
        startDate: startDateObj,
        endDate: endDateObj,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        positionsAvailable: positionsAvailable || 0,
        location: location || 'ON_CAMPUS',
        requirements: requirements || [],
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

const cleanEnumFilter = (value, validValues) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return undefined;

  const inputArray = Array.isArray(value) ? value : [value];

  // Filter out empty strings and only keep valid enums
  const filtered = inputArray
    .filter((v) => typeof v === 'string' && v.trim() !== '')
    .filter((v) => validValues.includes(v));

  return filtered.length > 0 ? { in: filtered } : undefined;
};

// Finish where clause builder
export const buildProjectWhereClause = ({ status, type, facultyId, query, department, location }) => {
  const where = {};

  // Generate filters for status, type, location and department
  const statusFilter = cleanEnumFilter(status, Object.values(ProjectStatus));
  const typeFilter = cleanEnumFilter(type, Object.values(ProjectType));
  const locationFilter = cleanEnumFilter(location, Object.values(Location));
  const departmentFilter = cleanEnumFilter(department, []); // Assuming no enum, otherwise pass valid values

  // Only add filters if they are not undefined or empty
  if (statusFilter) where.status = statusFilter;
  if (typeFilter) where.type = typeFilter;
  if (locationFilter) where.location = locationFilter;

  // If department is specified, apply it as a filter to the faculty
  if (departmentFilter) {
    where.faculty = { department: departmentFilter };
  }

  // If a search query is provided, add it as an OR filter for title, description, or keywords
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { keywords: { has: query } },
      { faculty: { user: { name: { contains: query, mode: 'insensitive' } } } },
    ];
  }

  // Add facultyId filter if it is provided
  if (facultyId) where.facultyId = facultyId;

  return where;
};

// Search projects with filters and pagination
export const searchProjects = async (req, res) => {
  try {
    const { query, department, status, type, location, page = 1, pageSize = 5 } = req.body;

    // Build where clause with the provided filters
    const where = buildProjectWhereClause({ query, department, status, type, location });

    // Set pagination parameters
    const skip = (page - 1) * pageSize;

    // Fetch projects and total count in parallel
    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          faculty: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  department: true,
                  profilePicUrl: true,
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({
        where, // Pass the same where clause to count query
      })
    ]);

    // Return the response with projects and total count
    res.json({ projects, totalCount });
  } catch (error) {
    console.error("Error searching projects:", error);
    res.status(500).json({ message: "Failed to search projects", error: error.message });
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
        },
        submissions: {
          orderBy: {
            dueDate: 'asc'
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
      take: 10,
      include: {
        faculty: {
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
        }
      }
    });

    res.json({
      projects: recentProjects.map(project => ({
        ...project,
        facultyName: project.faculty?.user?.name || "Unknown"
      }))
    });
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
      },
      include: {
        faculty: {
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
        }
      }
    });

    res.json({
      projects: trendingProjects.map(project => ({
        ...project,
        facultyName: project.faculty?.user?.name || "Unknown"
      }))
    });
  } catch (error) {
    console.error("Error fetching trending projects:", error);
    res.status(500).json({ message: "Failed to fetch trending projects" });
  }
};

// Update project status
export const updateProjectStatus = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { newStatus } = req.body;
    
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
    
    // Validate the status transition
    const currentStatus = project.status;
    
    // Only allow specific transitions
    if (
      (currentStatus === 'PENDING' && newStatus === 'ONGOING') || 
      (currentStatus === 'ONGOING' && newStatus === 'COMPLETED')
    ) {
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          status: newStatus
        }
      });
      
      return res.json({ 
        message: `Project status successfully updated from ${currentStatus} to ${newStatus}`, 
        project: updatedProject 
      });
    } else {
      return res.status(400).json({ 
        message: `Invalid status transition. Cannot change from ${currentStatus} to ${newStatus}. Valid transitions are: PENDING → ONGOING or ONGOING → COMPLETED` 
      });
    }
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({ message: 'Failed to update project status', error: error.message });
  }
};
