import prisma from '../../prisma/prismaClient.js';
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

/**
 * Middleware to validate application submission
 */
export const validateApplication = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if project is accepting applications
    if (project.status !== 'PENDING' && project.status !== 'ONGOING') {
      return res.status(400).json({
        success: false,
        message: 'This project is not accepting applications'
      });
    }
    
    // Check if application deadline has passed
    if (project.applicationDeadline && new Date() > project.applicationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }
    
    // Check if positions are available
    if (project.positionsAvailable <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No positions available for this project'
      });
    }
    
    // Check if user has already applied
    const existingApplication = await prisma.application.findFirst({
      where: {
        projectId,
        userId
      }
    });
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this project'
      });
    }

    // Add project to request for the controller
    req.project = project;
    next();
  } catch (error) {
    console.error('Application validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating application',
      error: error.message
    });
  }
};

/**
 * Middleware to check if the faculty can access an application
 */
export const validateApplicationAccess = async (req, res, next) => {
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
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check permissions
    if (req.user.role === 'USER' && application.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this application'
      });
    }
    
    if (req.user.role === 'FACULTY') {
      const faculty = await prisma.faculty.findUnique({
        where: { userId: req.user.id }
      });
      
      if (!faculty || application.project.facultyId !== faculty.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this application'
        });
      }
    }
    
    // Add application to request for the controller
    req.application = application;
    next();
  } catch (error) {
    console.error('Application access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating application access',
      error: error.message
    });
  }
};

/**
 * Middleware to validate application status updates
 */
export const validateApplicationStatusUpdate = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ACCEPTED, REJECTED, or PENDING'
      });
    }
    
    // Faculty check is handled by validateApplicationAccess middleware
    const application = req.application;
    
    // Additional validation for ACCEPTED status
    if (status === 'ACCEPTED' && application.status !== 'ACCEPTED') {
      // Check if positions are still available
      const project = await prisma.project.findUnique({
        where: { id: application.projectId },
        select: { positionsAvailable: true }
      });
      
      if (project.positionsAvailable <= 0) {
        return res.status(400).json({
          success: false,
          message: 'No positions available for this project'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Application status update validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating application status update',
      error: error.message
    });
  }
};