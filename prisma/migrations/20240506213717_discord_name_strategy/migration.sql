-- AlterTable
ALTER TABLE `Auth` ADD COLUMN `discordStrategy` ENUM('FULL_NAME', 'FIRST_NAME', 'CID_ONLY') NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `discordStrategy` ENUM('FULL_NAME', 'FIRST_NAME', 'CID_ONLY') NULL;
