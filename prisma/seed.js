import prisma from "./prismaClient.js";

async function seed() {
    try {
        await prisma.user.createMany({
            data: [
                {
                    email: 'admin@example.com',
                    name: 'Admin User',
                    role: 'ADMIN',
                    firebaseUid: 'admin-uid'
                },
                {
                    email: 'faculty@example.com',
                    name: 'Faculty Member',
                    role: 'FACULTY',
                    firebaseUid: 'faculty-uid'
                }
            ]
        });

        console.log('✅ Database seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
