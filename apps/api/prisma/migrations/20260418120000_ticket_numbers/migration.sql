-- Add human-friendly ticket/question number to questions.
ALTER TABLE "Question" ADD COLUMN "ticketNumber" INTEGER;

-- Backfill existing rows with sequential numbers by creation order.
WITH seq AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "Question"
)
UPDATE "Question" q
SET "ticketNumber" = seq.rn
FROM seq
WHERE q."id" = seq."id";

-- Unique index on ticketNumber.
CREATE UNIQUE INDEX "Question_ticketNumber_key" ON "Question"("ticketNumber");
