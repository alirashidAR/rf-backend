// models/chatSchema.js
import mongoose from 'mongoose';

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for chat system');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Message Schema
const MessageSchema = new mongoose.Schema({
  sender: {
    id: { type: String, required: true }, // User ID from CockroachDB
    name: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'FACULTY', 'USER'], required: true },
    profilePicUrl: { type: String }
  },
  content: { type: String },
  // For small files stored directly in MongoDB (< 16MB)
  embeddedFiles: [{
    data: { type: Buffer },
    contentType: { type: String },
    filename: { type: String },
    size: { type: Number } // Size in bytes
  }],
  // For large files stored in Cloudinary
  attachments: [{
    url: { type: String, required: true },
    type: { type: String, required: true }, // 'image', 'document', 'video', etc.
    filename: { type: String, required: true },
    size: { type: Number } // Size in bytes
  }],
  reactions: [{
    userId: { type: String, required: true },
    emoji: { type: String, required: true }
  }],
  // Track read status for each participant
  readBy: [{
    userId: { type: String, required: true },
    readAt: { type: Date, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Chat Room Schema
const ChatRoomSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true }, // Project ID from CockroachDB
  projectTitle: { type: String, required: true },
  faculty: {
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  participants: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['FACULTY', 'USER'], required: true },
    profilePicUrl: { type: String }
  }],
  messages: [MessageSchema],
  // Track unread count for each participant
  unreadCounts: [{
    userId: { type: String, required: true },
    count: { type: Number, default: 0 }
  }],
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create models
const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);
const Message = mongoose.model('Message', MessageSchema);

export { ChatRoom, Message, connectMongoDB };