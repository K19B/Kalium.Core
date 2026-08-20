/*
  Warnings:

  - You are about to drop the column `Firstname` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `Id` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `Lastname` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `Level` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `Username` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `commandProcessed` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstname` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastSeen` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastname` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageProcessed` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registered` to the `user` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "user_Id_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "Firstname",
DROP COLUMN "Id",
DROP COLUMN "Lastname",
DROP COLUMN "Level",
DROP COLUMN "Username",
ADD COLUMN     "commandProcessed" INTEGER NOT NULL,
ADD COLUMN     "firstname" TEXT NOT NULL,
ADD COLUMN     "id" BIGINT NOT NULL,
ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastname" TEXT NOT NULL,
ADD COLUMN     "level" "permission" NOT NULL,
ADD COLUMN     "messageProcessed" INTEGER NOT NULL,
ADD COLUMN     "registered" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_id_key" ON "user"("id");
