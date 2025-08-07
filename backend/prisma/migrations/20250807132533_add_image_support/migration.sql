-- AlterTable
ALTER TABLE "Item" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "ImageCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageCache_itemName_key" ON "ImageCache"("itemName");
