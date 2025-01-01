/*
  Warnings:

  - Added the required column `color` to the `UserTrackingList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `UserTrackingList` ADD COLUMN `color` VARCHAR(191) NOT NULL;
