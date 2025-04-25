/*
  Warnings:

  - You are about to drop the column `researchInteress` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "researchInteress";
ALTER TABLE "User" ADD COLUMN     "researchInterests" STRING[];
ALTER TABLE "User" ALTER COLUMN "bio" DROP NOT NULL;
