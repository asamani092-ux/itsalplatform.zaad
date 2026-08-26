-- Restructure EmployeeRole: EMPLOYEE | SECTION_MANAGER | DIRECTOR
-- Migrate existing data: MANAGER -> SECTION_MANAGER, RECEPTION -> EMPLOYEE

-- Rename old enum out of the way (only if not already migrated)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeRole')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeRole_old') THEN
    ALTER TYPE "EmployeeRole" RENAME TO "EmployeeRole_old";
  END IF;
END $$;

-- Create the new enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmployeeRole') THEN
    CREATE TYPE "EmployeeRole" AS ENUM ('EMPLOYEE', 'SECTION_MANAGER', 'DIRECTOR');
  END IF;
END $$;

-- Convert the column with value mapping
ALTER TABLE "CommEmployee" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "CommEmployee" ALTER COLUMN "role" TYPE "EmployeeRole"
  USING (
    CASE "role"::text
      WHEN 'MANAGER' THEN 'SECTION_MANAGER'
      WHEN 'RECEPTION' THEN 'EMPLOYEE'
      WHEN 'DIRECTOR' THEN 'DIRECTOR'
      WHEN 'SECTION_MANAGER' THEN 'SECTION_MANAGER'
      ELSE 'EMPLOYEE'
    END::"EmployeeRole"
  );

ALTER TABLE "CommEmployee" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';

-- Drop the old enum
DROP TYPE IF EXISTS "EmployeeRole_old";
