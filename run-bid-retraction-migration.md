# 🚀 Run Bid Retraction Migration

## 📋 **What This Migration Does:**

This migration adds the ability for runners to **retract their bids** on errands, which will:

1. **Add 'retracted' status** to the bid_status enum
2. **Add retraction tracking** - when and why a bid was retracted
3. **Create retract_bid() function** - handles the retraction logic
4. **Reset errands** - if an accepted bid is retracted, the errand goes back to 'open' status
5. **Allow re-bidding** - runners can place new bids after retracting

## 🔧 **How to Run:**

### **Option 1: Via Supabase Dashboard (Recommended)**

1. **Open your Supabase project** at [supabase.com](https://supabase.com)
2. **Go to SQL Editor** in the left sidebar
3. **Copy and paste** the migration SQL from `supabase/migrations/20250807080000_add_bid_retraction.sql`
4. **Click "Run"** to execute the migration
5. **Verify success** - you should see confirmation messages

### **Option 2: Via Supabase CLI**

```bash
# Navigate to your project directory
cd /path/to/your/zinderr/project

# Run the migration
supabase db push

# Or if you prefer to run specific migration
supabase db reset --linked
```

## ✅ **What Happens After Migration:**

### **For Runners:**
- ✅ **Can retract pending bids** - anytime before acceptance
- ✅ **Can retract accepted bids** - if errand hasn't started yet
- ✅ **Can place new bids** - after retracting previous ones
- ✅ **See retraction history** - when and why bids were retracted

### **For Posters:**
- ✅ **See retracted bid status** - in the bids list
- ✅ **Errand resets to open** - if accepted bid was retracted
- ✅ **Can accept new bids** - from other runners

### **Database Changes:**
- ✅ **New bid status**: 'retracted'
- ✅ **New columns**: `retracted_at`, `retraction_reason`
- ✅ **New function**: `retract_bid(bid_id, reason)`
- ✅ **Updated RLS policies** - runners can retract own bids

## 🧪 **Testing the Feature:**

### **1. Place a Bid:**
- Login as a runner
- Find an open errand
- Place a bid with amount and message

### **2. Retract the Bid:**
- In the bid modal, click "Retract" button
- Confirm the retraction
- Bid status should change to "retracted"

### **3. Place New Bid:**
- After retraction, you should see "Place new bid" button
- Click to place a new bid with different amount/message

### **4. Check Poster View:**
- Login as poster
- View errand details
- Should see retracted bid with retraction info

## 🚨 **Important Notes:**

### **When Retraction is NOT Allowed:**
- ❌ **Errand in progress** - can't retract accepted bid
- ❌ **Errand completed** - can't retract accepted bid
- ❌ **Other user's bid** - can only retract your own bids

### **What Happens on Retraction:**
- ✅ **Bid status** → 'retracted'
- ✅ **Retraction timestamp** → recorded
- ✅ **Retraction reason** → stored (optional)
- ✅ **Errand status** → 'open' (if was accepted)
- ✅ **Assigned runner** → cleared (if was accepted)

## 🔍 **Verification Commands:**

After running the migration, you can verify it worked:

```sql
-- Check the new enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bid_status')
ORDER BY enumsortorder;

-- Check the new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name IN ('retracted_at', 'retraction_reason');

-- Test the function
SELECT retract_bid('some-bid-id-here', 'Changed my mind');
```

## 🎉 **Result:**

After running this migration, runners will have full control over their bids:

- ✅ **Retract pending bids** anytime
- ✅ **Retract accepted bids** (if errand hasn't started)
- ✅ **Place new bids** after retraction
- ✅ **See retraction history** and reasons
- ✅ **Errands reset properly** when accepted bids are retracted

**The bid retraction feature is now fully functional!** 🚀✨
