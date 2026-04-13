-- AlterTable
ALTER TABLE `VatsimUser` MODIFY `accessTokenExpire` DATETIME(3) NULL,
    MODIFY `refreshToken` TEXT NULL;
