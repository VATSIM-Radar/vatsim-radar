-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `settings` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accessToken` VARCHAR(191) NOT NULL,
    `accessTokenExpire` DATETIME(3) NOT NULL,
    `refreshMaxDate` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `UserToken_accessToken_key`(`accessToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Auth` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `state` VARCHAR(191) NOT NULL,
    `type` ENUM('NAVIGRAPH', 'VATSIM') NOT NULL,
    `verifier` VARCHAR(191) NULL,

    UNIQUE INDEX `Auth_state_key`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NavigraphUser` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `accessToken` TEXT NOT NULL,
    `accessTokenExpire` DATETIME(3) NOT NULL,
    `refreshToken` VARCHAR(191) NOT NULL,
    `hasFms` BOOLEAN NOT NULL,

    UNIQUE INDEX `NavigraphUser_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VatsimUser` (
    `id` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NOT NULL,
    `accessTokenExpire` DATETIME(3) NOT NULL,
    `refreshToken` TEXT NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `VatsimUser_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserToken` ADD CONSTRAINT `UserToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NavigraphUser` ADD CONSTRAINT `NavigraphUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VatsimUser` ADD CONSTRAINT `VatsimUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

