-- DropIndex
DROP INDEX `UserPreset_type_idx` ON `UserPreset`;

-- DropIndex
DROP INDEX `UserTrackingList_color_idx` ON `UserTrackingList`;

-- CreateIndex
CREATE INDEX `Auth_createdAt_idx` ON `Auth`(`createdAt`);

-- CreateIndex
CREATE INDEX `User_discordId_idx` ON `User`(`discordId`);

-- CreateIndex
CREATE INDEX `User_privateUntil_idx` ON `User`(`privateUntil`);

-- CreateIndex
CREATE INDEX `UserIframeToken_refreshToken_idx` ON `UserIframeToken`(`refreshToken`);

-- CreateIndex
CREATE INDEX `UserIframeToken_refreshTokenExpire_idx` ON `UserIframeToken`(`refreshTokenExpire`);

-- CreateIndex
CREATE INDEX `UserToken_refreshMaxDate_idx` ON `UserToken`(`refreshMaxDate`);
