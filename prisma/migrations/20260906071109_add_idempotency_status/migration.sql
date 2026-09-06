-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED');

-- AlterTable
ALTER TABLE "IdempotencyKey" ADD COLUMN     "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING';
