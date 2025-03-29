import dotenv from "dotenv";
dotenv.config();
import prisma from "./prismaClient.js";

// async function seed() {
//     try {
//         await prisma.user.createMany({
//             data: [
//                 {
//                     email: 'admin@example.com',
//                     name: 'Admin User',
//                     role: 'ADMIN',
//                     firebaseUid: 'admin-uid'
//                 },
//                 {
//                     email: 'faculty@example.com',
//                     name: 'Faculty Member',
//                     role: 'FACULTY',
//                     firebaseUid: 'faculty-uid'
//                 },
//                 {
//                     email: 'user@example.com',
//                     name: 'User',
//                     role: 'USER',
//                     firebaseUid: 'user-uid'
//                 },
//                 {
//                     email: 'al@example.com',
//                     name: 'User',
//                     role: 'USER',
//                     firebaseUid: 'user-ud'
//                 }
//             ]
//         });

//         console.log('✅ Database seeded successfully');
//     } catch (error) {
//         console.error('❌ Error seeding database:', error);
//     } finally {
//         await prisma.$disconnect();
//     }
// }

// seed();

// async function main() {
//     console.log('Seeding database...');
  
  
//     const user = await prisma.user.findMany({
//       where: {
//           role: "FACULTY",
//       },
//     });
  
//     const faculty = await prisma.faculty.create({
//       data: {
//         userId: user[0].id,
//         title: 'Dr. John Doe',
//         specialization: ['AI', 'Machine Learning', 'Computer Vision'],
//         bio: 'Experienced researcher in AI and ML with multiple publications.',
//         researchAreas: ['Deep Learning', 'Edge Computing', 'Reinforcement Learning'],
//         officeHours: 'Monday & Wednesday, 2PM - 4PM',
//         contactInfo: 'johndoe@university.edu',
//       },
//     });
  
//     const projects = await prisma.project.createMany({
//       data: [
//         {
//           title: 'AI-based Weather Prediction',
//           description: 'Using machine learning to enhance weather forecasting accuracy.',
//           keywords: ['AI', 'Weather', 'Machine Learning'],
//           facultyId: faculty.id,
//           type: 'RESEARCH',
//           startDate: new Date('2025-01-15'),
//           endDate: new Date('2026-01-15'),
//           status: 'ONGOING',
//         },
//         {
//           title: 'Blockchain for Secure Voting',
//           description: 'Developing a decentralized voting system.',
//           keywords: ['Blockchain', 'Security', 'Voting'],
//           facultyId: faculty.id,
//           type: 'INDUSTRY',
//           startDate: new Date('2024-06-01'),
//           endDate: new Date('2025-06-01'),
//           status: 'COMPLETED',
//         },
//       ],
//     });
  
//     console.log('Seeding completed:', { faculty, projects });
//   }
  
//   main()
//     .catch((e) => {
//       console.error(e);
//       process.exit(1);
//     })
//     .finally(async () => {
//       await prisma.$disconnect();
//     });
  

async function makeFaculty(){
    const faculty = await prisma.faculty.create({
    data:{
        userId: "5de82c5d-5641-43f8-b64f-0ffb80c78f75" ,
        title: 'Dr. Ali Rashid',
        specialization: ['AI', 'Machine Learning', 'Computer Vision'],
        bio: 'Experienced researcher in AI and ML with multiple publications.',
        contactInfo: "alirashid.b38@gmail.com"
    }
    });
    console.log('Faculty created:', faculty);
}

makeFaculty()