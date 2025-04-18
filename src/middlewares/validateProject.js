//middlewares/validateProject.js

import { ProjectStatus, ProjectType, Location } from '@prisma/client';

/**
 * Middleware for validating project data
 */
export const validateProjectData = (req, res, next) => {
  try {
    const { title, description, status, startDate, endDate, location } = req.body;

    // Required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false, 
        message: 'Title and description are required fields'
      });
    }

    // Validate status if provided
    const validStatuses = Object.values(ProjectStatus);
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid project status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate location if provided
    const validLocations = Object.values(Location);
    if (location && !validLocations.includes(location)) {
      return res.status(400).json({
        success: false,
        message: `Invalid location type. Must be one of: ${validLocations.join(', ')}`
      });
    }

    // Convert and validate dates
    const startDateObj = startDate ? new Date(startDate) : null;
    const endDateObj = endDate ? new Date(endDate) : null;
    const currentDate = new Date();

    // Check date validity
    if (startDateObj && isNaN(startDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (endDateObj && isNaN(endDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    // Validate date relationships
    if (startDateObj && endDateObj && startDateObj >= endDateObj) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Validate dates based on project status
    if (status === 'COMPLETED') {
      if (!endDateObj || endDateObj > currentDate) {
        return res.status(400).json({
          success: false,
          message: 'For completed projects, end date must be set and not be in the future'
        });
      }
    } else if (status === 'ONGOING') {
      if (!startDateObj || startDateObj > currentDate) {
        return res.status(400).json({
          success: false,
          message: 'For ongoing projects, start date must be set and be in the past'
        });
      }
      if (!endDateObj || endDateObj <= currentDate) {
        return res.status(400).json({
          success: false,
          message: 'For ongoing projects, end date must be set and be in the future'
        });
      }
    } else if (status === 'PENDING') {
      if (!startDateObj || startDateObj <= currentDate) {
        return res.status(400).json({
          success: false,
          message: 'For pending projects, start date must be set and be in the future'
        });
      }
    }

    // Add parsed dates to the request object for controller use
    req.validatedDates = {
      startDate: startDateObj,
      endDate: endDateObj,
      applicationDeadline: req.body.applicationDeadline ? new Date(req.body.applicationDeadline) : null
    };

    next();
  } catch (error) {
    console.error('Project validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Validation error',
      error: error.message
    });
  }
};

/**
 * Middleware to check if the logged-in faculty owns a project
 */
export const verifyProjectOwnership = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const facultyId = req.user.facultyId;

    if (!facultyId) {
      return res.status(403).json({
        success: false,
        message: 'Faculty ID not found in token'
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.facultyId !== facultyId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this project'
      });
    }

    // Add project to request object for controller use
    req.project = project;
    next();
  } catch (error) {
    console.error('Project ownership verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying project ownership',
      error: error.message
    });
  }
};

/**
 * Middleware to validate project status transitions
 */
export const validateStatusTransition = (req, res, next) => {
  try {
    const { newStatus } = req.body;
    const currentStatus = req.project.status;

    const validTransitions = {
      'PENDING': ['ONGOING'],
      'ONGOING': ['COMPLETED']
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition. Cannot change from ${currentStatus} to ${newStatus}. Valid transitions are: PENDING → ONGOING or ONGOING → COMPLETED`
      });
    }

    next();
  } catch (error) {
    console.error('Status transition validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating status transition',
      error: error.message
    });
  }
};