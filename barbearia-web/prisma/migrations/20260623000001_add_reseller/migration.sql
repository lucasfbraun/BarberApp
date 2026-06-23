-- AlterTable: add couponCode to Barbershop
ALTER TABLE "Barbershop" ADD COLUMN "couponCode" TEXT;

-- CreateTable: Reseller
CREATE TABLE "Reseller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "couponCode" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reseller_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BarbershopReseller
CREATE TABLE "BarbershopReseller" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarbershopReseller_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reseller_email_key" ON "Reseller"("email");
CREATE UNIQUE INDEX "Reseller_couponCode_key" ON "Reseller"("couponCode");
CREATE UNIQUE INDEX "BarbershopReseller_barbershopId_key" ON "BarbershopReseller"("barbershopId");
CREATE INDEX "BarbershopReseller_resellerId_idx" ON "BarbershopReseller"("resellerId");

-- AddForeignKey
ALTER TABLE "BarbershopReseller" ADD CONSTRAINT "BarbershopReseller_barbershopId_fkey"
    FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BarbershopReseller" ADD CONSTRAINT "BarbershopReseller_resellerId_fkey"
    FOREIGN KEY ("resellerId") REFERENCES "Reseller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
