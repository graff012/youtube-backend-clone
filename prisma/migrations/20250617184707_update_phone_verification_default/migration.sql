-- AlterTable
ALTER TABLE "users" ALTER COLUMN "is_phone_verified" SET DEFAULT true;

-- CreateTable
CREATE TABLE "analytics" (
    "id" TEXT NOT NULL,
    "watch_time" INTEGER NOT NULL,
    "quality" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_videoId_idx" ON "analytics"("videoId");

-- CreateIndex
CREATE INDEX "analytics_userId_idx" ON "analytics"("userId");

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
