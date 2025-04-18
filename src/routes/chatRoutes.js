// routes/chatRoutes.js
import express from 'express';
import multer from 'multer';
import { 
  getChatMessages, 
  sendMessage, 
  markMessagesAsRead,
  markMessageAsRead,
  addReaction,
  getUnreadMessageCounts
} from '../controllers/chatController.js';
import { verifyChatAccess } from '../middlewares/chatAuth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit (adjust as needed)
  }
});

// Get all messages in a chat room
router.get('/projects/:projectId/chat', verifyChatAccess, getChatMessages);

// Send a message (with optional file attachments)
router.post(
  '/projects/:projectId/chat', 
  verifyChatAccess, 
  upload.array('attachments', 5), // Allow up to 5 attachments
  sendMessage
);

// Mark all messages as read
router.put(
  '/projects/:projectId/chat/read',
  verifyChatAccess,
  markMessagesAsRead
);

// Mark specific message as read
router.put(
  '/projects/:projectId/chat/:messageId/read',
  verifyChatAccess,
  markMessageAsRead
);

// Add/remove reaction to a message
router.post(
  '/projects/:projectId/chat/:messageId/reactions', 
  verifyChatAccess, 
  addReaction
);

// Get unread message counts for all chats the user is part of
router.get(
  '/chat/unread',
  verifyChatAccess,
  getUnreadMessageCounts
);

export default router;