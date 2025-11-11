-- AlterTable
ALTER TABLE `Notams`
    ADD COLUMN `active` BOOLEAN NULL;

UPDATE `Notams`
SET `active` = IFNULL(`active`, FALSE);

ALTER TABLE `Notams`
    MODIFY `active` BOOLEAN NOT NULL DEFAULT FALSE;
