-- AlterTable
ALTER TABLE `User` ADD COLUMN `privateMode` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `privateUntil` DATETIME(3) NULL;
