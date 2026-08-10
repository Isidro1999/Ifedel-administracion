-- Historial auditable de tipo de cambio USD → ARS.
-- No destructivo: no modifica Settings ni usdArsRate.

CREATE TABLE "exchange_rate_history" (
    "id" SERIAL NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "currencyBase" TEXT NOT NULL DEFAULT 'USD',
    "currencyQuote" TEXT NOT NULL DEFAULT 'ARS',
    "source" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "providerDate" TIMESTAMP(3),
    "providerTime" TEXT,
    "previousRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "exchange_rate_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exchange_rate_history_createdAt_idx" ON "exchange_rate_history"("createdAt");

CREATE INDEX "exchange_rate_history_source_createdAt_idx" ON "exchange_rate_history"("source", "createdAt");

ALTER TABLE "exchange_rate_history" ADD CONSTRAINT "exchange_rate_history_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
