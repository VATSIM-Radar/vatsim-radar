/*
  Warnings:

  - You are about to drop the `UserPresetList` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `UserPresetList` DROP FOREIGN KEY `UserPresetList_listId_fkey`;

-- DropForeignKey
ALTER TABLE `UserPresetList` DROP FOREIGN KEY `UserPresetList_presetId_fkey`;

-- DropTable
DROP TABLE `UserPresetList`;
