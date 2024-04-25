-- CreateEnum
CREATE TYPE "MaiServer" AS ENUM ('JP', 'Intl', 'CN');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('Unknown', 'Ban', 'Command', 'Advanced', 'Admin', 'Root');

-- CreateTable
CREATE TABLE "MaiAccount" (
    "Id" INTEGER NOT NULL,
    "Server" "MaiServer" NOT NULL,
    "MaiUserId" BIGINT NOT NULL,
    "MaiPassword" TEXT NOT NULL,
    "MaiToken" TEXT NOT NULL,
    "MaiFCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "Id" INTEGER NOT NULL,
    "Username" TEXT NOT NULL,
    "Firstname" TEXT NOT NULL,
    "Lastname" TEXT NOT NULL,
    "Level" "Permission" NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MaiAccount_Id_key" ON "MaiAccount"("Id");

-- CreateIndex
CREATE UNIQUE INDEX "User_Id_key" ON "User"("Id");
