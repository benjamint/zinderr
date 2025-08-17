# 🐛 Debug Bid Retraction Issue

## 🚨 **Problem:**
As a runner, you don't see the retract bid modal/button.

## 🔍 **Debugging Steps:**

### **Step 1: Check Browser Console**
1. **Open Developer Tools** (F12 or right-click → Inspect)
2. **Go to Console tab**
3. **Look for debug logs** starting with 🔍
4. **Check for any errors** in red

### **Step 2: Verify Database Migration**
The bid retraction feature requires the database migration to be run first.

**Check if migration was run:**
```sql
-- Run this in Supabase SQL Editor
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bid_status')
ORDER BY enumsortorder;
```

**Expected result:**
```
enumlabel
----------
pending
accepted
rejected
retracted
```

**If you don't see 'retracted', run the migration first!**

### **Step 3: Test Basic Bid Flow**
1. **Login as runner**
2. **Find an open errand**
3. **Place a bid** (amount + message)
4. **Check if bid was created**

**Look for these console logs:**
```
🔍 Fetching existing bid for: {errandId: "...", runnerId: "...", userType: "runner"}
🔍 Existing bid result: {found: true, bidData: {...}, error: null}
🔍 BidModal Debug: {existingBid: {...}, canRetract: true, ...}
```

### **Step 4: Check Bid Status**
After placing a bid, the modal should show:
- **Title**: "Update bid" (not "Place bid")
- **Retract button**: Red button with "Retract" text
- **Current bid status**: Should show "pending"

### **Step 5: Common Issues & Fixes**

#### **Issue 1: No console logs**
- **Problem**: JavaScript not loading properly
- **Fix**: Refresh page, check for JS errors

#### **Issue 2: "No bid found" in logs**
- **Problem**: Bid wasn't created or user ID mismatch
- **Fix**: Check if you're logged in as the right user

#### **Issue 3: Migration not run**
- **Problem**: Database doesn't have 'retracted' status
- **Fix**: Run the migration SQL first

#### **Issue 4: canRetract is false**
- **Problem**: Logic preventing retraction
- **Fix**: Check bid status and errand status

## 🧪 **Quick Test Script:**

### **1. Place Test Bid:**
```javascript
// In browser console, check if you can place a bid
console.log('Testing bid placement...')
```

### **2. Check Existing Bid:**
```javascript
// Check if existing bid is found
console.log('Checking existing bid...')
```

### **3. Verify Retract Logic:**
```javascript
// Check if retract button should show
console.log('Checking retract logic...')
```

## 🔧 **Manual Database Check:**

If the frontend isn't working, check the database directly:

```sql
-- Check if you have any bids
SELECT * FROM bids 
WHERE runner_id = 'your-user-id-here'
ORDER BY created_at DESC;

-- Check bid status enum
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'bid_status');

-- Check if retract_bid function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'retract_bid';
```

## 🎯 **Expected Behavior:**

### **After Placing Bid:**
1. ✅ **Modal title**: "Update bid"
2. ✅ **Retract button**: Red button visible
3. ✅ **Console logs**: Debug information showing
4. ✅ **Bid status**: "pending" displayed

### **After Clicking Retract:**
1. ✅ **Confirmation modal**: Appears with warning
2. ✅ **Retract button**: "Yes, retract bid" in red
3. ✅ **Bid status**: Changes to "retracted"

### **After Retraction:**
1. ✅ **Modal title**: "Place bid" (not "Update bid")
2. ✅ **Button text**: "Place new bid"
3. ✅ **Retract button**: Hidden (no existing bid)

## 🆘 **Still Not Working?**

If you're still having issues:

1. **Check console logs** - what do you see?
2. **Verify migration** - was it run successfully?
3. **Check user type** - are you logged in as a runner?
4. **Check errand status** - is the errand "open"?
5. **Share console output** - what debug information appears?

## 🎉 **Success Indicators:**

The bid retraction is working when you see:

- ✅ **Red "Retract" button** after placing a bid
- ✅ **Confirmation modal** when clicking retract
- ✅ **"Place new bid"** button after retraction
- ✅ **Console logs** showing debug information
- ✅ **No JavaScript errors** in console

**Let me know what you see in the console logs and we can debug this step by step!** 🚀✨
