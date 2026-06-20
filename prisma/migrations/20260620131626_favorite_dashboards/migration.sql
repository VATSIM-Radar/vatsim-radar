-- CreateTable
CREATE TABLE `FavoriteDashboard` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dashboardId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FavoriteDashboard` ADD CONSTRAINT `FavoriteDashboard_dashboardId_fkey` FOREIGN KEY (`dashboardId`) REFERENCES `Dashboard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteDashboard` ADD CONSTRAINT `FavoriteDashboard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
