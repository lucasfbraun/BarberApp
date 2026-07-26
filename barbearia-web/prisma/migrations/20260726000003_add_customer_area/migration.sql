-- Area do cliente final: conta de cliente vinculada e ultima barbearia acessada.
ALTER TABLE "User" ADD COLUMN "lastBarbershopId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "userId" TEXT;
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");
