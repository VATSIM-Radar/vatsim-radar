CREATE UNIQUE INDEX `UserTrackingList_one_friends_per_user`
    ON `UserTrackingList` (
        (IF(`type` = 'FRIENDS', `userId`, NULL))
        );