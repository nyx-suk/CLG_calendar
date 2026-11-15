-- AlterTable
ALTER TABLE "EventApplication" ADD COLUMN "proofFileKey" TEXT;
ALTER TABLE "EventApplication" ADD COLUMN "proofMimeType" TEXT;
ALTER TABLE "EventApplication" ADD COLUMN "proofOriginalName" TEXT;
ALTER TABLE "EventApplication" ADD COLUMN "proofSizeBytes" INTEGER;

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "detectedMime" TEXT NOT NULL,
    "sanitizedFileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNATTACHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileDownloadLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "downloadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileDownloadLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileDownloadLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EventApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "department" TEXT,
    "semester" INTEGER,
    "section" TEXT,
    "rollNumber" TEXT,
    "githubUsername" TEXT,
    "mentorId" TEXT,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "createdAt", "department", "email", "emailVerified", "githubUsername", "id", "image", "mentorId", "name", "role", "rollNumber", "section", "semester", "updatedAt") SELECT "active", "createdAt", "department", "email", "emailVerified", "githubUsername", "id", "image", "mentorId", "name", "role", "rollNumber", "section", "semester", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Upload_key_key" ON "Upload"("key");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
