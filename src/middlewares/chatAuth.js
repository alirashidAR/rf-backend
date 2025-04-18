// middlewares/chatAuth.js
import { PrismaClient } from '@prisma/client';
import verifyJWT from './verifyJwt.js';

const prisma = new PrismaClient();

// Middleware to verify if user can access a specific chat
export const verifyChatAccess = async (req, res, next) => {
  try {
    // First verify JWT token
    await verifyJWT(req, res, async () => {
      const { projectId } = req.params;
      const userId = req.user.id;

      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          faculty: true,
          participants: true
        }
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check if user is faculty member or participant
      const isFaculty = project.faculty.userId === userId;
      const isParticipant = project.participants.some(p => p.userId === userId);

      if (!isFaculty && !isParticipant) {
        return res.status(403).json({ message: 'You do not have access to this chat' });
      }

      next();
    });
  } catch (error) {
    console.error('Error verifying chat access:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export default { verifyChatAccess };