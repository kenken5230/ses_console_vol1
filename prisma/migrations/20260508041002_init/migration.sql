/*
  Warnings:

  - You are about to drop the column `sales_account_id` on the `proposals` table. All the data in the column will be lost.
  - Added the required column `sales_mail_account_id` to the `proposals` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "proposal_type" AS ENUM ('person_to_company', 'person_to_project');

-- DropForeignKey
ALTER TABLE "proposals" DROP CONSTRAINT "proposals_sales_account_id_fkey";

-- DropIndex
DROP INDEX "proposals_person_id_project_id_target_company_id_sales_acco_idx";

-- DropIndex
DROP INDEX "proposals_sales_account_id_status_idx";

-- AlterTable
ALTER TABLE "proposals" DROP COLUMN "sales_account_id",
ADD COLUMN     "proposal_type" "proposal_type" NOT NULL DEFAULT 'person_to_project',
ADD COLUMN     "sales_mail_account_id" UUID NOT NULL,
ALTER COLUMN "project_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "proposals_person_id_project_id_target_company_id_sales_mail_idx" ON "proposals"("person_id", "project_id", "target_company_id", "sales_mail_account_id");

-- CreateIndex
CREATE INDEX "proposals_sales_mail_account_id_status_idx" ON "proposals"("sales_mail_account_id", "status");

-- CreateIndex
CREATE INDEX "proposals_proposal_type_status_idx" ON "proposals"("proposal_type", "status");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_sales_mail_account_id_fkey" FOREIGN KEY ("sales_mail_account_id") REFERENCES "mail_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
