import prisma from '../../prisma/prismaClient.js';
import { uploadFile } from '../config/cloudinary.js';
import multer from 'multer';

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
        resumeUrl: resumeUrl || null
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
    if (req.user.role === 'USER' && application.userId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to view this application' });
    }
    
    if (req.user.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: req.user.id }
      });
      
      const project = await prisma.project.findUnique({
        where: { id: application.projectId }
      });
      
      if (project.facultyId !== faculty.id) {
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
    
    // Verify faculty owns this project
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project || project.facultyId !== faculty.id) {
      return res.status(403).json({ message: 'You do not have permission to view these applications' });
    }
    
    const where = { projectId };
    if (status) where.status = status;
    
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
    const applications = await prisma.application.findMany({
      where: {
        userId: req.user.id
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
  try {
    const applicationId = req.params.id;
    const { status } = req.body;
    
    if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Verify faculty owns the project
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true
      }
    });
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    if (application.project.facultyId !== faculty.id) {
      return res.status(403).json({ message: 'You do not have permission to update this application' });
    }
    
    // Check if status is being changed to ACCEPTED
    if (status === 'ACCEPTED' && application.status !== 'ACCEPTED') {
      // Check if positions are still available
      if (application.project.positionsAvailable <= 0) {
        return res.status(400).json({ message: 'No positions available for this project' });
      }
      
      // Reduce available positions by 1
      await prisma.project.update({
        where: { id: application.projectId },
        data: { positionsAvailable: { decrement: 1 } }
      });
      
      // Add student to project participants
      await prisma.projectParticipants.create({
        data: {
          userId: application.userId,
          projectId: application.projectId
        }
      });
    }
    
    // If changing from ACCEPTED to another status, increment the positions back
    if (application.status === 'ACCEPTED' && status !== 'ACCEPTED') {
      // Increase available positions by 1
      await prisma.project.update({
        where: { id: application.projectId },
        data: { positionsAvailable: { increment: 1 } }
      });
      
      // Remove student from project participants
      await prisma.projectParticipants.deleteMany({
        where: {
          userId: application.userId,
          projectId: application.projectId
        }
      });
    }
    
    // Update application status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: { status }
    });
    
    res.json({ 
      message: `Application ${status.toLowerCase()} successfully`, 
      application: updatedApplication,
      projectPositionsRemaining: status === 'ACCEPTED' ? 
        application.project.positionsAvailable - 1 : 
        (application.status === 'ACCEPTED' ? application.project.positionsAvailable + 1 : application.project.positionsAvailable)
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Failed to update application status', error: error.message });
  }
};

// Get student profile details for faculty review
export const getStudentProfile = async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    // Verify faculty owns the project
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: true
      }
    });
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    const faculty = await prisma.faculty.findUnique({
      where: { userId: req.user.id }
    });
    
    if (application.project.facultyId !== faculty.id) {
      return res.status(403).json({ message: 'You do not have permission to view this student profile' });
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
    
    // You can also get student's past applications, projects, etc.
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


export const getAllApplicationsForFaculty = async (req, res) => {
  const { facultyId } = req.params.facultyId;
  try {
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
    })
    res.json(applications);
  }catch (error) {
    console.error('Error fetching all applications:', error);
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
}