-- CreateEnum
CREATE TYPE "regMaiServer" AS ENUM ('JP', 'Intl', 'CN');

-- CreateEnum
CREATE TYPE "maiLoginType" AS ENUM ('sega', 'netId', 'friend');

-- CreateEnum
CREATE TYPE "permission" AS ENUM ('disabled', 'default', 'whiteListed', 'admin', 'owner');

-- CreateTable
CREATE TABLE "maiAccount" (
    "id" INTEGER NOT NULL,
    "server" "regMaiServer" NOT NULL,
    "loginType" "maiLoginType" NOT NULL,
    "maiId" TEXT NOT NULL,
    "maiToken" TEXT NOT NULL,
    "maiAlterId" TEXT NOT NULL,
    "maiAlterToken" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "user" (
    "Id" INTEGER NOT NULL,
    "Username" TEXT NOT NULL,
    "Firstname" TEXT NOT NULL,
    "Lastname" TEXT NOT NULL,
    "Level" "permission" NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "maiAccount_id_key" ON "maiAccount"("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_Id_key" ON "user"("Id");
