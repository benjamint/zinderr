# 🚀 Zinderr Local Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Set up Supabase

### 2.1 Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for the project to be ready

### 2.2 Get Your Project Credentials
1. Go to your project dashboard
2. Navigate to Settings → API
3. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 2.3 Update Environment Variables
Edit the `.env` file in the project root and replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

## Step 3: Set up Database

### 3.1 Run Database Migrations
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migrations in order:
   - `supabase/migrations/20250806072440_tight_frost.sql`
   - `supabase/migrations/20250806230233_spring_glade.sql`
   - `supabase/migrations/20250807072542_twilight_cottage.sql`

### 3.2 Verify Database Setup
After running migrations, you should have these tables:
- `profiles`
- `errands`
- `bids`
- `transactions`
- `mutual_ratings`
- `wallets`

## Step 4: Start the Development Server
```bash
npm run dev
```

The app should now be running at `http://localhost:5173`

## Step 5: Verify Setup

### 5.1 Check Console
Open your browser's developer tools and check the console for:
- ✅ "Supabase connection successful!" - Everything is working
- ❌ "Supabase connection failed" - Check your environment variables

### 5.2 Test Authentication
1. Open the app in your browser
2. Try to sign up with a test account
3. Verify you can log in and out

## Troubleshooting

### Environment Variables Not Set
If you see "Supabase environment variables are not set":
1. Check that your `.env` file exists in the project root
2. Verify the variable names are correct (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
3. Restart the development server after making changes

### Database Connection Failed
If you see "Supabase connection failed":
1. Verify your project URL and anon key are correct
2. Check that your Supabase project is active
3. Ensure the database migrations have been run

### Authentication Issues
If authentication doesn't work:
1. Check that Row Level Security (RLS) policies are enabled
2. Verify the `profiles` table exists and has the correct structure
3. Check the browser console for specific error messages

## Next Steps

Once the app is running successfully:
1. Create test accounts for both posters and runners
2. Test posting errands and placing bids
3. Verify the wallet and rating systems work
4. Test the verification flow for runners

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations have been applied
4. Check the Supabase project logs for any backend errors
