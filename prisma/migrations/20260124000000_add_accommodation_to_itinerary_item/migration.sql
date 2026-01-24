-- Add accommodationId column to ItineraryItem (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ItineraryItem' AND column_name = 'accommodationId'
    ) THEN
        ALTER TABLE "ItineraryItem" ADD COLUMN "accommodationId" TEXT;
    END IF;
END $$;

-- Add itemType column to ItineraryItem with default (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ItineraryItem' AND column_name = 'itemType'
    ) THEN
        ALTER TABLE "ItineraryItem" ADD COLUMN "itemType" TEXT NOT NULL DEFAULT 'place';
    END IF;
END $$;

-- Make placeId nullable (if it's currently NOT NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ItineraryItem'
        AND column_name = 'placeId'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "ItineraryItem" ALTER COLUMN "placeId" DROP NOT NULL;
    END IF;
END $$;

-- Create index on accommodationId (if not exists)
CREATE INDEX IF NOT EXISTS "ItineraryItem_accommodationId_idx" ON "ItineraryItem"("accommodationId");

-- Add foreign key constraint for accommodationId (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ItineraryItem_accommodationId_fkey'
    ) THEN
        ALTER TABLE "ItineraryItem"
        ADD CONSTRAINT "ItineraryItem_accommodationId_fkey"
        FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add itineraryItems relation to Accommodation (already exists in schema, this is just for documentation)
-- The relation is handled by the foreign key above

-- Update existing items to have itemType = 'place' if null
UPDATE "ItineraryItem" SET "itemType" = 'place' WHERE "itemType" IS NULL;
