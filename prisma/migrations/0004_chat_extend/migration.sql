/*
  Warnings:

  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "chatType" AS ENUM ('private', 'group', 'superGroup', 'channel');

-- DropTable
DROP TABLE "user";

-- CreateTable
CREATE TABLE "chat" (
    "id" BIGINT NOT NULL,
    "username" TEXT NOT NULL,
    "type" "chatType" NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "permission" NOT NULL,
    "messageProcessed" INTEGER NOT NULL,
    "commandProcessed" INTEGER NOT NULL,
    "registered" TIMESTAMP(3) NOT NULL,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "commandEnabled" TEXT[]
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_id_key" ON "chat"("id");
