/*
  Warnings:

  - A unique constraint covering the columns `[dashboardId,userId]` on the table `FavoriteDashboard` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `FavoriteDashboard_dashboardId_userId_key` ON `FavoriteDashboard`(`dashboardId`, `userId`);
