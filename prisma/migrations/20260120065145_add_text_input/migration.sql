-- CreateTable
CREATE TABLE "TextInput" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "extractedText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceTextInput" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "textInputId" TEXT NOT NULL,

    CONSTRAINT "PlaceTextInput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TextInput_projectId_idx" ON "TextInput"("projectId");

-- CreateIndex
CREATE INDEX "TextInput_status_idx" ON "TextInput"("status");

-- CreateIndex
CREATE INDEX "PlaceTextInput_placeId_idx" ON "PlaceTextInput"("placeId");

-- CreateIndex
CREATE INDEX "PlaceTextInput_textInputId_idx" ON "PlaceTextInput"("textInputId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceTextInput_placeId_textInputId_key" ON "PlaceTextInput"("placeId", "textInputId");

-- AddForeignKey
ALTER TABLE "TextInput" ADD CONSTRAINT "TextInput_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTextInput" ADD CONSTRAINT "PlaceTextInput_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTextInput" ADD CONSTRAINT "PlaceTextInput_textInputId_fkey" FOREIGN KEY ("textInputId") REFERENCES "TextInput"("id") ON DELETE CASCADE ON UPDATE CASCADE;
