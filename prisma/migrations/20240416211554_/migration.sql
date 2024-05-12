/*
  Warnings:

  - The values [DISCORD] on the enum `Auth_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Auth` MODIFY `type` ENUM('NAVIGRAPH', 'VATSIM') NOT NULL;
