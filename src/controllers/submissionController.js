import prisma from '../../prisma/prismaClient.js';
import validateSubmission from '../middlewares/validateSubmission.js';
import { uploadFile } from '../config/cloudinary.js';

/**
 * Create a new submission for a project
 */
export const createSubmission = async (req, res) => {
  try {
    const { projectId, title, description, dueDate } = req.body;

    // Validate faculty owns the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { faculty: true }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if the faculty making the request owns the project
    if (project.facultyId !== req.user.facultyId) {
      return res.status(403).json({ message: 'You do not have permission to add submissions to this project' });
    }

    const submission = await prisma.submission.create({
      data: {
        projectId,
        title,
        description,
        dueDate: new Date(dueDate)
      }
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ message: 'Failed to create submission', error: error.message });
  }
};

/**
 * Get all submissions for a project
 */
export const getProjectSubmissions = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { faculty: true }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is faculty owner
    // The user has a role of FACULTY and their id matches the project's facultyId
    const isOwner = req.user.role === 'FACULTY' && project.facultyId === req.user.facultyId;
    
    if (!isOwner) {
      // Check if user is a participant
      const isParticipant = await prisma.projectParticipants.findFirst({
        where: {
          userId: req.user.id,
          projectId: projectId
        }
      });
      
      if (!isParticipant) {
        return res.status(403).json({ message: 'You do not have permission to view this submission' });
      }
    }

    const submissions = await prisma.submission.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' }
    });

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Failed to fetch submissions', error: error.message });
  }
};

/**
 * Get a specific submission with all submission items
 */
export const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { 
        project: true,
        submissionItems: {
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
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if user is faculty owner
    // The user has a role of FACULTY and their id matches the project's facultyId
    const isOwner = req.user.role === 'FACULTY' && submission.project.facultyId === req.user.facultyId;
    
    if (!isOwner) {
      // Check if user is a participant
      const isParticipant = await prisma.projectParticipants.findFirst({
        where: {
          userId: req.user.id,
          projectId: submission.projectId
        }
      });
      
      if (!isParticipant) {
        return res.status(403).json({ message: 'You do not have permission to view this submission' });
      }
    }

    res.status(200).json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Failed to fetch submission', error: error.message });
  }
};


/**
 * Update a submission
 */
export const updateSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { title, description, dueDate } = req.body;
    
    // Validate submission exists
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { project: true }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if the faculty making the request owns the project
    if (submission.project.facultyId !== req.user.facultyId) {
      return res.status(403).json({ message: 'You do not have permission to update this submission' });
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    });

    res.status(200).json(updatedSubmission);
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ message: 'Failed to update submission', error: error.message });
  }
};

/**
 * Delete a submission
 */
export const deleteSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Validate submission exists
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { project: true }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if the faculty making the request owns the project
    if (submission.project.facultyId !== req.user.facultyId) {
      return res.status(403).json({ message: 'You do not have permission to delete this submission' });
    }

    await prisma.submission.delete({
      where: { id: submissionId }
    });

    res.status(200).json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ message: 'Failed to delete submission', error: error.message });
  }
};

/**
 * Submit an item for a submission (by student)
 */
export const submitItem = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;
    
    // Validate submission exists
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { project: true }
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if user is a project participant
    const isParticipant = await prisma.projectParticipants.findFirst({
      where: {
          userId,
          projectId: submission.projectId
      }
    });
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this project' });
    }

    // Check if user has already submitted
    const existingSubmission = await prisma.submissionItem.findFirst({
      where: {
        submissionId,
        userId
      }
    });

    let fileUrl = null;
    
    // Handle file upload if provided
    if (req.file) {
      fileUrl = await uploadFile(req.file, `submissions/${submissionId}/${userId}`);
    }

    let submissionItem;
    const now = new Date();
    const status = 'SUBMITTED';

    if (existingSubmission) {
      // Update existing submission
      submissionItem = await prisma.submissionItem.update({
        where: { id: existingSubmission.id },
        data: {
          fileUrl: fileUrl || existingSubmission.fileUrl,
          submittedAt: now,
          status
        }
      });
    } else {
      // Create new submission
      submissionItem = await prisma.submissionItem.create({
        data: {
          submissionId,
          userId,
          fileUrl,
          status
        }
      });
    }

    res.status(200).json(submissionItem);
  } catch (error) {
    console.error('Error submitting item:', error);
    res.status(500).json({ message: 'Failed to submit item', error: error.message });
  }
};

/**
 * Provide feedback for a submission item (by faculty)
 */
export const provideFeedback = async (req, res) => {
  try {
    const { submissionItemId } = req.params;
    const { feedback } = req.body;
    
    // Validate submission item exists
    const submissionItem = await prisma.submissionItem.findUnique({
      where: { id: submissionItemId },
      include: { 
        submission: {
          include: { project: true }
        }
      }
    });

    if (!submissionItem) {
      return res.status(404).json({ message: 'Submission item not found' });
    }

    // Check if the faculty making the request owns the project
    if (submissionItem.submission.project.facultyId !== req.user.facultyId) {
      return res.status(403).json({ message: 'You do not have permission to provide feedback for this submission' });
    }

    const updatedSubmissionItem = await prisma.submissionItem.update({
      where: { id: submissionItemId },
      data: {
        feedback,
        status: 'GRADED'
      }
    });

    res.status(200).json(updatedSubmissionItem);
  } catch (error) {
    console.error('Error providing feedback:', error);
    res.status(500).json({ message: 'Failed to provide feedback', error: error.message });
  }
};