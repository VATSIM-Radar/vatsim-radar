-- CreateTable
CREATE TABLE `Notams` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('ERROR', 'WARNING', 'ANNOUNCEMENT') NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `activeFrom` DATETIME(3) NULL,
    `activeTo` DATETIME(3) NULL,
    `dismissable` BOOLEAN NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
