// scripts/createChatRoomsForExistingProjects.js
import { PrismaClient } from '@prisma/client';
import { ChatRoom } from '../src/models/chatSchema.js'; // Adjust the import path as necessary
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function createChatRoomsForExistingProjects() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Get all projects from CockroachDB
    const projects = await prisma.project.findMany({
      include: {
        faculty: {
          include: {
            user: true
          }
        }
      }
    });
    console.log(`Found ${projects.length} projects in CockroachDB`);

    // Get all existing chat rooms from MongoDB
    const existingChatRooms = await ChatRoom.find({}, { projectId: 1 });
    const existingProjectIds = new Set(existingChatRooms.map(room => room.projectId));
    console.log(`Found ${existingChatRooms.length} existing chat rooms in MongoDB`);

    // Filter projects that don't have chat rooms
    const projectsWithoutChatRooms = projects.filter(project => !existingProjectIds.has(project.id));
    console.log(`Found ${projectsWithoutChatRooms.length} projects without chat rooms`);

    // Create chat rooms for projects without them
    let createdCount = 0;
    for (const project of projectsWithoutChatRooms) {
      try {
        // Create chat room in MongoDB
        await ChatRoom.create({
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
          messages: [],
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        createdCount++;
        console.log(`Created chat room for project: ${project.title} (${project.id})`);
      } catch (error) {
        console.error(`Error creating chat room for project ${project.id}:`, error);
      }
    }

    console.log(`Successfully created ${createdCount} chat rooms`);

    // Also add project participants to chat rooms if they exist
    let participantsAdded = 0;
    for (const project of projectsWithoutChatRooms) {
      try {
        // Get project participants
        const projectParticipants = await prisma.projectParticipants.findMany({
          where: { projectId: project.id },
          include: { user: true }
        });

        if (projectParticipants.length > 0) {
          const chatRoom = await ChatRoom.findOne({ projectId: project.id });
          
          if (chatRoom) {
            // Add each participant to the chat room
            for (const participant of projectParticipants) {
              // Check if participant is already in the chat room
              const existingParticipant = chatRoom.participants.find(p => p.id === participant.userId);
              
              if (!existingParticipant) {
                // Add participant to chat room
                chatRoom.participants.push({
                  id: participant.user.id,
                  name: participant.user.name,
                  role: participant.user.role,
                  profilePicUrl: participant.user.profilePicUrl || null
                });
                
                // Add unread count for participant
                chatRoom.unreadCounts.push({
                  userId: participant.user.id,
                  count: 0
                });
                
                participantsAdded++;
              }
            }
            
            // Save changes
            await chatRoom.save();
            console.log(`Added ${projectParticipants.length} participants to chat room for project ${project.id}`);
          }
        }
      } catch (error) {
        console.error(`Error adding participants to chat room for project ${project.id}:`, error);
      }
    }

    console.log(`Added ${participantsAdded} participants to chat rooms`);

  } catch (error) {
    console.error('Error in migration script:', error);
  } finally {
    // Close connections
    await mongoose.connection.close();
    await prisma.$disconnect();
    console.log('Connections closed');
  }
}

// Run the migration
createChatRoomsForExistingProjects()
  .then(() => console.log('Migration completed'))
  .catch(error => console.error('Migration failed:', error));
