import { ChatRoom } from '../models/chatSchema.js';

// Maximum size for embedded files in MongoDB (15MB to be safe)
export const MAX_EMBEDDED_FILE_SIZE = 15 * 1024 * 1024;

/**
 * Middleware to check chat room access
 */
export const validateChatAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Find chat room
    const chatRoom = await ChatRoom.findOne({ projectId });
    
    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // Check if user is a participant
    const participant = chatRoom.participants.find(p => p.id === userId);
    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this chat'
      });
    }

    // Add chatRoom and participant to request for controllers
    req.chatRoom = chatRoom;
    req.participant = participant;
    next();
  } catch (error) {
    console.error('Chat access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating chat access',
      error: error.message
    });
  }
};

/**
 * Middleware to validate message existence
 */
export const validateMessageExists = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const chatRoom = req.chatRoom; // From validateChatAccess middleware
    
    // Find the message
    const messageIndex = chatRoom.messages.findIndex(m => m._id.toString() === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Add message and index to request
    req.message = chatRoom.messages[messageIndex];
    req.messageIndex = messageIndex;
    next();
  } catch (error) {
    console.error('Message validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating message',
      error: error.message
    });
  }
};

/**
 * Middleware to validate message content
 */
export const validateMessageContent = (req, res, next) => {
  try {
    const { content } = req.body;
    
    // Check if there's content or files
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Message must have content or attachments'
      });
    }
    
    // Content length limits if needed
    if (content && content.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Message content exceeds maximum length of 5000 characters'
      });
    }
    
    next();
  } catch (error) {
    console.error('Message content validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating message content',
      error: error.message
    });
  }
};

/**
 * Middleware to validate reaction
 */
export const validateReaction = (req, res, next) => {
  try {
    const { emoji } = req.body;
    
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid emoji is required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Reaction validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating reaction',
      error: error.message
    });
  }
};