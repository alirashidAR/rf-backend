/*
  Warnings:

  - The `status` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Location" AS ENUM ('REMOTE', 'ON_CAMPUS');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ONGOING', 'PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "applicationDeadline" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN     "location" "Location" NOT NULL DEFAULT 'ON_CAMPUS';
ALTER TABLE "Project" ADD COLUMN     "positionsAvailable" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN     "requirements" STRING[];
ALTER TABLE "Project" DROP COLUMN "status";
ALTER TABLE "Project" ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING';
