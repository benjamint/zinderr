# 🚨 Fix Enum Casting Error

## ❌ **Error Encountered:**
```
ERROR: 42804: default for column "status" cannot be cast automatically to type bid_status_new
```

## 🔍 **What Causes This Error:**

The error occurs because PostgreSQL can't automatically cast the **default value** of the `status` column when changing the enum type. This happens when:

1. **Existing table** has a default value for the `status` column
2. **New enum type** includes the same values but is technically different
3. **PostgreSQL** can't automatically convert the default constraint

## ✅ **Solutions:**

### **Solution 1: Fixed Migration (Recommended)**

Use the updated migration file: `supabase/migrations/20250807080000_add_bid_retraction.sql`

This migration now:
- ✅ **Removes the default** before changing the type
- ✅ **Changes the column type** safely
- ✅ **Adds the default back** with the new enum type

### **Solution 2: Alternative Migration**

Use the alternative approach: `supabase/migrations/20250807080000_add_bid_retraction_alternative.sql`

This migration:
- ✅ **Adds columns first** (safe operation)
- ✅ **Handles enum change** more carefully
- ✅ **Includes verification steps**

### **Solution 3: Manual Fix (If Migration Still Fails)**

If you're still getting errors, you can fix this manually:

```sql
-- Step 1: Check current status column
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bids' AND column_name = 'status';

-- Step 2: Remove default constraint
ALTER TABLE bids ALTER COLUMN status DROP DEFAULT;

-- Step 3: Create new enum
CREATE TYPE bid_status_new AS ENUM ('pending', 'accepted', 'rejected', 'retracted');

-- Step 4: Change column type
ALTER TABLE bids 
  ALTER COLUMN status TYPE bid_status_new 
  USING status::text::bid_status_new;

-- Step 5: Add default back
ALTER TABLE bids ALTER COLUMN status SET DEFAULT 'pending';

-- Step 6: Clean up
DROP TYPE bid_status;
ALTER TYPE bid_status_new RENAME TO bid_status;

-- Step 7: Add new columns
ALTER TABLE bids ADD COLUMN IF NOT EXISTS retracted_at timestamptz DEFAULT NULL;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS retraction_reason text DEFAULT NULL;
```

## 🧪 **Testing the Fix:**

### **1. Run the Migration:**
```sql
-- Copy and paste the fixed migration SQL
-- Run it in Supabase SQL Editor
```

### **2. Verify the Changes:**
```sql
-- Check enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bid_status')
ORDER BY enumsortorder;

-- Check new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name IN ('retracted_at', 'retraction_reason');

-- Check status column
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bids' AND column_name = 'status';
```

### **3. Test the Function:**
```sql
-- Test the retract_bid function (with a real bid ID)
-- SELECT retract_bid('your-bid-id-here', 'Testing retraction');
```

## 🚨 **Common Issues & Fixes:**

### **Issue 1: "Type already exists"**
```sql
-- Drop the type if it exists
DROP TYPE IF EXISTS bid_status_new;
DROP TYPE IF EXISTS bid_status;
```

### **Issue 2: "Column doesn't exist"**
```sql
-- Check if columns exist first
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'bids';
```

### **Issue 3: "Policy already exists"**
```sql
-- Drop existing policies first
DROP POLICY IF EXISTS "Runners can retract own bids" ON bids;
```

## 🔧 **Prevention for Future:**

### **Best Practices:**
1. **Always remove defaults** before changing column types
2. **Test migrations** on a copy of production data first
3. **Use IF NOT EXISTS** for columns and functions
4. **Include verification queries** in migrations

### **Safe Migration Pattern:**
```sql
-- 1. Add new columns (safe)
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_column data_type;

-- 2. Remove constraints (if changing types)
ALTER TABLE table_name ALTER COLUMN column_name DROP DEFAULT;

-- 3. Change column type
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type USING cast_expression;

-- 4. Add constraints back
ALTER TABLE table_name ALTER COLUMN column_name SET DEFAULT 'new_default';

-- 5. Verify changes
SELECT * FROM information_schema.columns WHERE table_name = 'table_name';
```

## 🎉 **Expected Result:**

After running the fixed migration, you should have:

- ✅ **New enum values**: pending, accepted, rejected, retracted
- ✅ **New columns**: retracted_at, retraction_reason
- ✅ **Working function**: retract_bid()
- ✅ **Updated policies**: Runners can retract own bids
- ✅ **No errors**: Clean migration execution

## 🆘 **Still Having Issues?**

If you're still encountering problems:

1. **Check Supabase logs** for detailed error messages
2. **Verify table structure** before running migration
3. **Try the alternative migration** approach
4. **Contact support** with the specific error details

**The fixed migration should resolve the enum casting error!** 🚀✨
