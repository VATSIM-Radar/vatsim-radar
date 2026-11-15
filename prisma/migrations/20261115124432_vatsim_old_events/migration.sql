-- CreateTable
CREATE TABLE `VatsimEvent` (
    `id` INTEGER NOT NULL,
    `type` ENUM('Event', 'Controller Examination', 'VASOPS') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `link` VARCHAR(191) NOT NULL,
    `organisers` JSON NOT NULL,
    `airports` JSON NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `shortDescription` TEXT NOT NULL,
    `description` LONGTEXT NOT NULL,
    `banner` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
