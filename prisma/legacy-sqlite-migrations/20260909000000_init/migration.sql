-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'homepage',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleSlug" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parentId" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CommentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporter" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ArticleView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleSlug" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL DEFAULT 'anonymous',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TypoReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleSlug" TEXT NOT NULL,
    "quotedText" TEXT NOT NULL,
    "correction" TEXT NOT NULL,
    "reporter" TEXT NOT NULL DEFAULT 'anonymous',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReadingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleSlug" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL DEFAULT 'anonymous',
    "scrollDepth" INTEGER NOT NULL DEFAULT 0,
    "timeOnPage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE INDEX "Comment_articleSlug_idx" ON "Comment"("articleSlug");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "CommentReport_commentId_idx" ON "CommentReport"("commentId");

-- CreateIndex
CREATE INDEX "ArticleView_articleSlug_idx" ON "ArticleView"("articleSlug");

-- CreateIndex
CREATE INDEX "ArticleView_createdAt_idx" ON "ArticleView"("createdAt");

-- CreateIndex
CREATE INDEX "ArticleView_articleSlug_ipHash_idx" ON "ArticleView"("articleSlug", "ipHash");

-- CreateIndex
CREATE INDEX "TypoReport_articleSlug_idx" ON "TypoReport"("articleSlug");

-- CreateIndex
CREATE INDEX "TypoReport_status_idx" ON "TypoReport"("status");

-- CreateIndex
CREATE INDEX "ReadingSession_articleSlug_idx" ON "ReadingSession"("articleSlug");

-- CreateIndex
CREATE INDEX "ReadingSession_createdAt_idx" ON "ReadingSession"("createdAt");

