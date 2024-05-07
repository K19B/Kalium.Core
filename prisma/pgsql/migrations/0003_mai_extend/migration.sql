-- CreateEnum
CREATE TYPE "musicDifficulty" AS ENUM ('BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'ReMASTER', 'UTAGE');

-- AlterTable
ALTER TABLE "maiAccount" ALTER COLUMN "id" SET DATA TYPE BIGINT;

-- CreateTable
CREATE TABLE "musicScore" (
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "difficulty" "musicDifficulty" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "dxScore" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "maiData" (
    "id" BIGINT NOT NULL,
    "server" "regMaiServer" NOT NULL,
    "loginType" "maiLoginType" NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "musicScore_name_key" ON "musicScore"("name");

-- CreateIndex
CREATE UNIQUE INDEX "maiData_id_key" ON "maiData"("id");
