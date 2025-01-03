-- CreateTable
CREATE TABLE `UserPresetList` (
    `presetId` INTEGER NOT NULL,
    `listId` INTEGER NOT NULL,

    PRIMARY KEY (`presetId`, `listId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserPresetList` ADD CONSTRAINT `UserPresetList_presetId_fkey` FOREIGN KEY (`presetId`) REFERENCES `UserPreset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPresetList` ADD CONSTRAINT `UserPresetList_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `UserTrackingList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
