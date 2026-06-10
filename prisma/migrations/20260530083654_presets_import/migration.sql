-- CreateIndex
CREATE INDEX `UserPreset_userId_type_idx` ON `UserPreset`(`userId`, `type`);

-- CreateIndex
CREATE INDEX `UserPreset_type_idx` ON `UserPreset`(`type`);
