/*
  Warnings:

  - You are about to drop the column `name` on the `chat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat" DROP COLUMN "name",
ADD COLUMN     "title" TEXT,
ALTER COLUMN "firstname" DROP NOT NULL,
ALTER COLUMN "lastname" DROP NOT NULL;
