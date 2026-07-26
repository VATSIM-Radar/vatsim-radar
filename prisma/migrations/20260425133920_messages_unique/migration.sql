/*
  Warnings:

  - A unique constraint covering the columns `[message,userId]` on the table `UserAcknowledgedMessages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `UserAcknowledgedMessages_message_userId_key` ON `UserAcknowledgedMessages`(`message`, `userId`);
