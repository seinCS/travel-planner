-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "formattedAddress" TEXT,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "priceLevel" INTEGER,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "userRatingsTotal" INTEGER;

-- CreateIndex
CREATE INDEX "Place_googlePlaceId_idx" ON "Place"("googlePlaceId");
