/*
  Warnings:

  - Added the required column `active` to the `Notams` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Notams` ADD COLUMN `active` BOOLEAN NOT NULL;
