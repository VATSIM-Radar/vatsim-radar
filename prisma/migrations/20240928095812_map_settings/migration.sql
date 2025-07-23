/*
  Warnings:

  - You are about to drop the column `mapSettings` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `mapSettings`;

-- CreateTable
CREATE TABLE `UserPreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('MAP_SETTINGS') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `json` JSON NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserPreset` ADD CONSTRAINT `UserPreset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
