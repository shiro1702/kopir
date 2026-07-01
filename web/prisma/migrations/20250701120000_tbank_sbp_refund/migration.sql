-- Split online SBP from card: new payment method for T-Bank SBP
ALTER TYPE "PaymentMethod" ADD VALUE 'TBANK_SBP';

-- Track refunded payments
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- Points with TBANK_ONLINE enabled also get TBANK_SBP (preserves prior behavior)
UPDATE "Point"
SET "paymentMethodsEnabled" = array_append("paymentMethodsEnabled", 'TBANK_SBP'::"PaymentMethod")
WHERE 'TBANK_ONLINE'::"PaymentMethod" = ANY("paymentMethodsEnabled")
  AND NOT ('TBANK_SBP'::"PaymentMethod" = ANY("paymentMethodsEnabled"));
