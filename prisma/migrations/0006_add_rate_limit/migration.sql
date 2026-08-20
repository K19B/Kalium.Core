-- Create the extensible per-user, per-feature rate-limit table.
CREATE TABLE IF NOT EXISTS "rateLimit" (
    "userId" BIGINT NOT NULL,
    "feature" TEXT NOT NULL,
    "minuteStart" TIMESTAMP(3) NOT NULL,
    "minuteCount" INTEGER NOT NULL,
    "hourStart" TIMESTAMP(3) NOT NULL,
    "hourCount" INTEGER NOT NULL,
    "dayStart" TIMESTAMP(3) NOT NULL,
    "dayCount" INTEGER NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("userId", "feature")
);

CREATE INDEX IF NOT EXISTS "rateLimit_userId_idx" ON "rateLimit"("userId");

-- Preserve existing Fax counters when upgrading from the temporary table.
DO $$
BEGIN
    IF to_regclass('"faxLimit"') IS NOT NULL THEN
        INSERT INTO "rateLimit" (
            "userId", "feature", "minuteStart", "minuteCount",
            "hourStart", "hourCount", "dayStart", "dayCount"
        )
        SELECT
            "id", 'fax', "minuteStart", "minuteCount",
            "hourStart", "hourCount", "dayStart", "dayCount"
        FROM "faxLimit"
        ON CONFLICT ("userId", "feature") DO NOTHING;

        DROP TABLE "faxLimit";
    END IF;
END $$;