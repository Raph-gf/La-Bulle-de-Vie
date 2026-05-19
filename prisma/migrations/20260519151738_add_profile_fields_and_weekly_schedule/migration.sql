-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percent', 'fixed');

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_clientId_fkey";

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_clientId_fkey";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "amountPaid" INTEGER,
ADD COLUMN     "clientAddress" TEXT,
ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCodeId" TEXT,
ADD COLUMN     "giftCardId" TEXT,
ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ADD COLUMN     "travelFee" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "amountPaid" INTEGER,
ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCodeId" TEXT,
ADD COLUMN     "giftCardId" TEXT,
ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vatRate" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "cabinetAddress" TEXT,
ADD COLUMN     "cabinetLat" DOUBLE PRECISION,
ADD COLUMN     "cabinetLng" DOUBLE PRECISION,
ADD COLUMN     "defaultShippingAddress" JSONB,
ADD COLUMN     "notificationPrefs" JSONB,
ADD COLUMN     "preferredLocation" TEXT,
ADD COLUMN     "specialistNotes" TEXT,
ADD COLUMN     "taxSettings" JSONB,
ADD COLUMN     "travelPricing" JSONB,
ADD COLUMN     "weeklySchedule" JSONB;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "vatRate" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "firstBookingOnly" BOOLEAN NOT NULL DEFAULT false,
    "appliesTo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "purchasedById" TEXT,
    "redeemedById" TEXT,
    "stripePaymentIntentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchasedById_fkey" FOREIGN KEY ("purchasedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
