import prisma from '../../prisma/prismaClient.js';
import { uploadFile } from '../config/cloudinary.js';
import multer from 'multer';

import { 
  addParticipantToChatRoom,  
  removeParticipantFromChatRoom
} from './chatController.js';

// Configure multer for file uploads
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only PDF and DOC files
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/msword' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC files are allowed'), false);
    }
  }
});

// Submit a new application
export const submitApplication = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { coverLetter } = req.body;
    const userId = req.user.id;
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has already applied
    const existingApplication = await prisma.application.findFirst({
      where: {
        projectId,
        userId
      }
    });
    
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this project' });
    }

    // Handle file upload if there's a file
    let resumeUrl = null;
    if (req.file) {
      try {
        // Upload file to Cloudinary
        resumeUrl = await uploadFile(req.file, 'application_documents');
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        return res.status(500).json({ message: 'Failed to upload document', error: uploadError.message });
      }
    }
    
    // Create application
    const application = await prisma.application.create({
      data: {
        projectId,
        userId,
        coverLetter: coverLetter || null,
        resumeUrl: resumeUrl || null,
        status: 'PENDING' // Explicitly set initial status
      }
    });
    
    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ message: 'Failed to submit application', error: error.message });
  }
};

// Get application details
export const getApplicationById = async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicUrl: true
          }
        }
      }
    });
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Check permissions
    if (req.user.role === 'ADMIN') {
      // Admin can view any application
      return res.json(application);
    }
    
    if (req.user.role === 'USER' && application.userId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to view this application' });
    }
    
    if (req.user.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: req.user.id }
      });
      
      if (!faculty) {
        return res.status(403).json({ message: 'Faculty profile not found' });
      }
      
      const project = await prisma.project.findUnique({
        where: { id: application.projectId }
      });
      
      if (!project || project.facultyId !== faculty.id) {
        return res.status(403).json({ message: 'You do not have permission to view this application' });
      }
    }
    
    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ message: 'Failed to fetch application', error: error.message });
  }
};

// Get all applications for a project (faculty only)
export const getProjectApplications = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Verify faculty owns this project
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!faculty) {
      return res.status(403).json({ message: 'Faculty profile not found' });
    }
    
    if (project.facultyId !== faculty.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You do not have permission to view these applications' });
    }
    
    const where = { projectId };
    if (status) {
      // Validate status parameter
      const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status parameter' });
      }
      where.status = status;
    }
    
    const applications = await prisma.application.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching project applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
};

// Get student's applications
export const getStudentApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const applications = await prisma.application.findMany({
      where: {
        userId: userId
      },
      include: {
        project: {
          include: {
            faculty: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching student applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
};

// Update application status (accept/reject)
export const updateApplicationStatus = async (req, res) => {
  const prismaSession = await prisma.$transaction(async (tx) => {
    try {
      const applicationId = req.params.id;
      const { status } = req.body;
      
      // Validate status
      if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // Verify application exists
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          project: true
        }
      });
      
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      // Verify faculty owns the project
      const faculty = await tx.faculty.findUnique({
        where: { userId: req.user.id }
      });
      
      if (!faculty) {
        return res.status(403).json({ message: 'Faculty profile not found' });
      }
      
      if (application.project.facultyId !== faculty.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'You do not have permission to update this application' });
      }
      
      // Get current project positions available
      const currentProject = await tx.project.findUnique({
        where: { id: application.projectId }
      });
      
      if (!currentProject) {
        return res.status(404).json({ message: 'Associated project not found' });
      }
      
      // Check if status is being changed to ACCEPTED
      if (status === 'ACCEPTED' && application.status !== 'ACCEPTED') {
        // Check if positions are still available
        if (currentProject.positionsAvailable <= 0) {
          return res.status(400).json({ message: 'No positions available for this project' });
        }
        
        // Reduce available positions by 1
        await tx.project.update({
          where: { id: application.projectId },
          data: { positionsAvailable: { decrement: 1 } }
        });
        
        // Add student to project participants
        await tx.projectParticipants.create({
          data: {
            userId: application.userId,
            projectId: application.projectId
          }
        });
        
        // Add participant to chat room asynchronously, but don't wait
        // This avoids transaction issues with MongoDB operations
        addParticipantToChatRoom(application.projectId, application.userId)
          .catch(err => console.error('Error adding participant to chat room:', err));
      }
      
      // If changing from ACCEPTED to another status, increment the positions back
      if (application.status === 'ACCEPTED' && status !== 'ACCEPTED') {
        // Increase available positions by 1
        await tx.project.update({
          where: { id: application.projectId },
          data: { positionsAvailable: { increment: 1 } }
        });
        
        // Remove student from project participants
        await tx.projectParticipants.deleteMany({
          where: {
            userId: application.userId,
            projectId: application.projectId
          }
        });
        
        // Remove participant from chat room asynchronously, but don't wait
        // This avoids transaction issues with MongoDB operations
        removeParticipantFromChatRoom(application.projectId, application.userId)
          .catch(err => console.error('Error removing participant from chat room:', err));
      }
      
      // Update application status
      const updatedApplication = await tx.application.update({
        where: { id: applicationId },
        data: { status }
      });
      
      // Calculate new positions remaining
      let projectPositionsRemaining = currentProject.positionsAvailable;
      if (status === 'ACCEPTED' && application.status !== 'ACCEPTED') {
        projectPositionsRemaining--;
      } else if (application.status === 'ACCEPTED' && status !== 'ACCEPTED') {
        projectPositionsRemaining++;
      }
      
      return {
        success: true,
        message: `Application ${status.toLowerCase()} successfully`,
        application: updatedApplication,
        projectPositionsRemaining
      };
    } catch (error) {
      console.error('Error in transaction:', error);
      // Let the outer catch block handle this
      throw error;
    }
  });
  
  if (prismaSession.success) {
    res.json(prismaSession);
  } else {
    // This would only happen if the transaction itself throws an error
    res.status(500).json({ message: 'Failed to update application status' });
  }
};

// Get student profile details for faculty review
export const getStudentProfile = async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    // Verify application exists
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true
      }
    });
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Check permissions
    if (req.user.role === 'ADMIN') {
      // Admin can view any student profile
    } else if (req.user.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: req.user.id }
      });
      
      if (!faculty) {
        return res.status(403).json({ message: 'Faculty profile not found' });
      }
      
      if (application.project.facultyId !== faculty.id) {
        return res.status(403).json({ message: 'You do not have permission to view this student profile' });
      }
    } else {
      return res.status(403).json({ message: 'Insufficient permissions to view student profile' });
    }
    
    // Get student profile
    const student = await prisma.user.findUnique({
      where: { id: application.userId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        profilePicUrl: true,
        createdAt: true,
        // Add any other student profile fields you need
      }
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    
    // Get student's past applications, projects, etc.
    const studentHistory = await prisma.application.findMany({
      where: {
        userId: application.userId,
        NOT: {
          id: applicationId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });
    
    res.json({
      student,
      history: studentHistory
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({ message: 'Failed to fetch student profile', error: error.message });
  }
};

// Function to handle removing a participant from a project
// This is separate from the API endpoint function in projectController
// to avoid circular dependencies
export const removeParticipantFromProject = async (projectId, userId, tx) => {
  // Use provided transaction or create a new one
  const prisma = tx || prisma;
  
  // Remove participant from project participants
  await prisma.projectParticipants.deleteMany({
    where: {
      projectId: projectId,
      userId: userId
    }
  });
  
  // Remove participant from chat room asynchronously to avoid blocking
  try {
    await removeParticipantFromChatRoom(projectId, userId);
  } catch (error) {
    console.error('Error removing participant from chat room:', error);
    // Continue execution even if chat room update fails
  }
};

// Get all applications for a faculty
export const getAllApplicationsForFaculty = async (req, res) => {
  try {
    const facultyId = req.params.facultyId;
    
    // Verify the faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId }
    });
    
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // Check permissions (only admin or the faculty themselves)
    if (req.user.role !== 'ADMIN' && (req.user.role !== 'FACULTY' || faculty.userId !== req.user.id)) {
      return res.status(403).json({ message: 'You do not have permission to view these applications' });
    }
    
    const applications = await prisma.application.findMany({
      where: {
        project: {
          facultyId: facultyId
        }
      },
      include: {
        project: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching all applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
};