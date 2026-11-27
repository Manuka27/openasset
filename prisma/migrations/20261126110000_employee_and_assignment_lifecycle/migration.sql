-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM ('GOOD', 'NEEDS_SERVICE', 'DAMAGED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "department" TEXT,
ADD COLUMN     "employeeNumber" TEXT;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "returnCondition" "ReturnCondition";

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE INDEX "Assignment_returnedAt_expectedReturnDate_idx" ON "Assignment"("returnedAt", "expectedReturnDate");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_one_open_per_asset_key" ON "Assignment"("assetId") WHERE ("returnedAt" IS NULL);
