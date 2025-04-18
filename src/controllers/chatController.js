// controllers/chatController.js
import { PrismaClient } from '@prisma/client';
import { ChatRoom } from '../models/chatSchema.js';
import pusher from '../config/pusher.js';
import { uploadFile } from '../config/cloudinary.js';

const prisma = new PrismaClient();

// Maximum size for embedded files in MongoDB (15MB to be safe)
const MAX_EMBEDDED_FILE_SIZE = 15 * 1024 * 1024;

// Initialize a chat room when a project is created
export const initializeChatRoom = async (projectId, facultyId) => {
  try {
    // Get project and faculty details from CockroachDB
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        faculty: {
          include: { user: true }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Create chat room in MongoDB
    const chatRoom = await ChatRoom.create({
      projectId: project.id,
      projectTitle: project.title,
      faculty: {
        id: project.faculty.userId,
        name: project.faculty.user.name
      },
      participants: [{
        id: project.faculty.userId,
        name: project.faculty.user.name,
        role: 'FACULTY',
        profilePicUrl: project.faculty.user.profilePicUrl || null
      }],
      unreadCounts: [{
        userId: project.faculty.userId,
        count: 0
      }],
      messages: []
    });

    console.log(`Chat room initialized for project: ${project.title}`);
    return chatRoom;
  } catch (error) {
    console.error('Error initializing chat room:', error);
    throw error;
  }
};

// Add a participant to chat room
export const addParticipantToChatRoom = async (projectId, userId) => {
    try {
      // Get user details from CockroachDB
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
  
      if (!user) {
        throw new Error('User not found');
      }
  
      // First, find the chat room to get the current message count
      const existingChatRoom = await ChatRoom.findOne({ projectId });
      
      if (!existingChatRoom) {
        throw new Error('Chat room not found');
      }
      
      // Calculate initial unread count
      const initialUnreadCount = existingChatRoom.messages?.length || 0;
  
      // Now update the chat room with the new participant
      const chatRoom = await ChatRoom.findOneAndUpdate(
        { projectId },
        { 
          $push: { 
            participants: {
              id: user.id,
              name: user.name,
              role: user.role,
              profilePicUrl: user.profilePicUrl || null
            },
            unreadCounts: {
              userId: user.id,
              count: initialUnreadCount
            }
          },
          updatedAt: new Date()
        },
        { new: true }
      );
  
      // Trigger Pusher event for real-time update
      pusher.trigger(
        `project-${projectId}-chat`,
        'participant-added',
        {
          participant: {
            id: user.id,
            name: user.name,
            role: user.role,
            profilePicUrl: user.profilePicUrl || null
          }
        }
      );
  
      return chatRoom;
    } catch (error) {
      console.error('Error adding participant to chat room:', error);
      throw error;
    }
  };
  
// Remove a participant from chat room
export const removeParticipantFromChatRoom = async (projectId, userId) => {
  try {
    // Remove user from chat room participants and unread counts
    const chatRoom = await ChatRoom.findOneAndUpdate(
      { projectId },
      { 
        $pull: { 
          participants: { id: userId },
          unreadCounts: { userId }
        },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!chatRoom) {
      throw new Error('Chat room not found');
    }

    // Trigger Pusher event for real-time update
    pusher.trigger(
      `project-${projectId}-chat`,
      'participant-removed',
      { userId }
    );

    return chatRoom;
  } catch (error) {
    console.error('Error removing participant from chat room:', error);
    throw error;
  }
};

// Get chat room messages
export const getChatMessages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Find chat room
    const chatRoom = await ChatRoom.findOne({ projectId });
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    const isParticipant = chatRoom.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    // Get unread count for this user
    const unreadCount = chatRoom.unreadCounts.find(u => u.userId === userId)?.count || 0;

    return res.status(200).json({
      chatRoom: {
        projectId: chatRoom.projectId,
        projectTitle: chatRoom.projectTitle,
        faculty: chatRoom.faculty,
        participants: chatRoom.participants,
        messages: chatRoom.messages,
        unreadCount,
        createdAt: chatRoom.createdAt,
        updatedAt: chatRoom.updatedAt,
        lastActivity: chatRoom.lastActivity
      }
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const files = req.files;

    // Find chat room
    const chatRoom = await ChatRoom.findOne({ projectId });
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    const participant = chatRoom.participants.find(p => p.id === userId);
    if (!participant) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    // Handle file uploads
    const embeddedFiles = [];
    const attachments = [];

    if (files && files.length > 0) {
      for (const file of files) {
        if (file.size <= MAX_EMBEDDED_FILE_SIZE) {
          // Store small files directly in MongoDB
          embeddedFiles.push({
            data: file.buffer,
            contentType: file.mimetype,
            filename: file.originalname,
            size: file.size
          });
        } else {
          // Upload large files to Cloudinary with structured folder path
          const fileType = file.mimetype.split('/')[0]; // 'image', 'video', 'application', etc.
          const folderPath = `projects/${projectId}/chat/${fileType}s`;
          const fileUrl = await uploadFile(file, folderPath);
          
          attachments.push({
            url: fileUrl,
            type: fileType,
            filename: file.originalname,
            size: file.size
          });
        }
      }
    }

    // Create new message
    const newMessage = {
      sender: {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        profilePicUrl: participant.profilePicUrl
      },
      content,
      embeddedFiles,
      attachments,
      reactions: [],
      // Message is automatically read by the sender
      readBy: [{
        userId: participant.id,
        readAt: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add message to chat room
    chatRoom.messages.push(newMessage);
    chatRoom.lastActivity = new Date();
    chatRoom.updatedAt = new Date();
    
    // Update unread counts for all participants except sender
    chatRoom.unreadCounts.forEach(unreadCount => {
      if (unreadCount.userId !== userId) {
        unreadCount.count += 1;
      }
    });
    
    await chatRoom.save();

    // Get the newly created message with its MongoDB _id
    const savedMessage = chatRoom.messages[chatRoom.messages.length - 1];

    // Trigger Pusher event for real-time update
    pusher.trigger(
      `project-${projectId}-chat`,
      'new-message',
      { 
        message: savedMessage,
        unreadCounts: chatRoom.unreadCounts
      }
    );

    return res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Find chat room
    const chatRoom = await ChatRoom.findOne({ projectId });
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    const isParticipant = chatRoom.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    // Mark messages as read that haven't been read by this user
    let messagesMarkedAsRead = 0;
    const now = new Date();
    
    chatRoom.messages.forEach(message => {
      if (!message.readBy.some(read => read.userId === userId)) {
        message.readBy.push({
          userId,
          readAt: now
        });
        messagesMarkedAsRead++;
      }
    });

    // Reset unread count for this user
    const unreadCountIndex = chatRoom.unreadCounts.findIndex(u => u.userId === userId);
    if (unreadCountIndex !== -1) {
      chatRoom.unreadCounts[unreadCountIndex].count = 0;
    }

    await chatRoom.save();

    // Trigger Pusher event for real-time update
    pusher.trigger(
      `project-${projectId}-chat`,
      'messages-read',
      { 
        userId,
        unreadCounts: chatRoom.unreadCounts
      }
    );

    return res.status(200).json({ 
      messagesMarkedAsRead,
      unreadCount: 0
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Mark specific message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const userId = req.user.id;

    // Find chat room
    const chatRoom = await ChatRoom.findOne({ projectId });
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    const isParticipant = chatRoom.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    // Find the message
    const messageIndex = chatRoom.messages.findIndex(m => m._id.toString() === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if message is already read by this user
    const message = chatRoom.messages[messageIndex];
    const alreadyRead = message.readBy.some(read => read.userId === userId);
    
    if (!alreadyRead) {
      // Mark message as read
      message.readBy.push({
        userId,
        readAt: new Date()
      });

      // Decrement unread count for this user if > 0
      const unreadCountIndex = chatRoom.unreadCounts.findIndex(u => u.userId === userId);
      if (unreadCountIndex !== -1 && chatRoom.unreadCounts[unreadCountIndex].count > 0) {
        chatRoom.unreadCounts[unreadCountIndex].count -= 1;
      }

      await chatRoom.save();

      // Trigger Pusher event for real-time update
      pusher.trigger(
        `project-${projectId}-chat`,
        'message-read',
        { 
          userId,
          messageId,
          unreadCounts: chatRoom.unreadCounts
        }
      );
    }

    return res.status(200).json({ 
      message: 'Message marked as read',
      unreadCount: chatRoom.unreadCounts.find(u => u.userId === userId)?.count || 0
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Add reaction to a message
export const addReaction = async (req, res) => {
  try {
    const { projectId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    // Find chat room
    const chatRoom = await ChatRoom.findOne({ projectId });
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Check if user is a participant
    const isParticipant = chatRoom.participants.some(p => p.id === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not a participant in this chat' });
    }

    // Find the message
    const messageIndex = chatRoom.messages.findIndex(m => m._id.toString() === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = chatRoom.messages[messageIndex].reactions.findIndex(
      r => r.userId === userId && r.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      // Remove existing reaction (toggle behavior)
      chatRoom.messages[messageIndex].reactions.splice(existingReactionIndex, 1);
    } else {
      // Add new reaction
      chatRoom.messages[messageIndex].reactions.push({ userId, emoji });
    }

    // Save changes
    await chatRoom.save();

    // Trigger Pusher event for real-time update
    pusher.trigger(
      `project-${projectId}-chat`,
      'reaction-updated',
      { 
        messageId, 
        reactions: chatRoom.messages[messageIndex].reactions 
      }
    );

    return res.status(200).json({ 
      reactions: chatRoom.messages[messageIndex].reactions 
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get unread message count for user across all projects
export const getUnreadMessageCounts = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all chat rooms where user is a participant
    const chatRooms = await ChatRoom.find({
      'participants.id': userId
    }, {
      projectId: 1,
      projectTitle: 1,
      'unreadCounts': { $elemMatch: { userId } }
    });

    // Format response
    const unreadCounts = chatRooms.map(room => ({
      projectId: room.projectId,
      projectTitle: room.projectTitle,
      unreadCount: room.unreadCounts?.[0]?.count || 0
    }));

    return res.status(200).json({ unreadCounts });
  } catch (error) {
    console.error('Error getting unread message counts:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export default {
  initializeChatRoom,
  addParticipantToChatRoom,
  removeParticipantFromChatRoom,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  markMessageAsRead,
  addReaction,
  getUnreadMessageCounts
};