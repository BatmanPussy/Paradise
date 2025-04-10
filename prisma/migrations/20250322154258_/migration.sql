/*
  Warnings:

  - Added the required column `enabled` to the `EnabledChannels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `keywords` to the `EnabledChannels` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EnabledChannels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "keywords" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" DATETIME NOT NULL
);
INSERT INTO "new_EnabledChannels" ("channelId", "createdAt", "guildId", "id", "updateAt") SELECT "channelId", "createdAt", "guildId", "id", "updateAt" FROM "EnabledChannels";
DROP TABLE "EnabledChannels";
ALTER TABLE "new_EnabledChannels" RENAME TO "EnabledChannels";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
