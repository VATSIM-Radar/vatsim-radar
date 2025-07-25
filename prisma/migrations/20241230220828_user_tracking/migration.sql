-- AlterTable
ALTER TABLE `User` ADD COLUMN `showFriendsInProfile` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `UserPreset` MODIFY `type` ENUM('MAP_SETTINGS', 'FILTER', 'BOOKMARK', 'DASHBOARD_BOOKMARK') NOT NULL;

-- CreateTable
CREATE TABLE `UserTrackingList` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `users` JSON NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserTrackingList` ADD CONSTRAINT `UserTrackingList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
