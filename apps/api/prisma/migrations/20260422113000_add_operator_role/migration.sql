DO $$
BEGIN
  IF to_regtype('"UserRole"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumlabel = 'OPERATOR'
        AND enumtypid = '"UserRole"'::regtype
    ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'OPERATOR';
  END IF;
END
$$;
