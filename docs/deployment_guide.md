# Deployment and Setup Guide

This guide provides step-by-step instructions for deploying the WebArt Ops Platform frontend and setting up the Supabase backend infrastructure.

## Prerequisites
- **Node.js** (v18 or higher)
- **Supabase Account** (Free tier is sufficient)
- **Vercel or Netlify Account** (For frontend hosting)

---

## 1. Backend Setup: Supabase

### Create a Project
1. Go to [database.new](https://database.new) and create a new project.
2. Store your **Project URL** and **Anon Key** safely.

### Database Initialization
1. In your Supabase dashboard, go to the **SQL Editor**.
2. Run the following SQL scripts in order (found in your project root):
   - `DATABASE_UPGRADE.sql`: Sets up core tables and RLS.
   - `TEAM_UPGRADE.sql`: Adds hierarchy and reporting fields.
   - `FINAL_DELETE_FIX.sql`: Patches all foreign key constraints.

### Authentication Config
1. Go to **Authentication** → **Providers**.
2. Enable **Email/Password** authentication.
3. Disable "Confirm email" if you want to allow instant access for new staff invitations.

---

## 2. Frontend Configuration

### Environment Variables
Create a `.env` file in the project root (use `.env.example` as a template):
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GHL_WEBHOOK_URL=your_ghl_webhook_url
VITE_GHL_API_KEY=your_ghl_api_v2_key
VITE_GHL_LOCATION_ID=your_ghl_location_id
```

### Build & Test Locally
```bash
npm install
npm run dev
```

---

## 3. Frontend Deployment (Vercel/Netlify)

### Vercel (Recommended)
1. Push your code to a GitHub/GitLab repository.
2. Import the project into Vercel.
3. Add your `.env` variables in the Vercel **Environment Variables** settings.
4. **Important**: Your build command should be `npm run build` and output directory `dist`.
5. Deploy.

---

## 4. Post-Deployment Checklist

### Invite Your Team
1. Log in as a **CEO** role user.
2. Go to the **Team Access Control** tab.
3. Use the **Invite Staff** modal to generate invite links or create accounts for your team.
4. Assign Project Managers to their respective Account Managers.

### Configure Form Settings
1. Go to the **Form Config** tab.
2. Set your **Currencies**, **Products**, and **Sales Reps**.
3. Configure your **Invoice Prefix** and starting counter (e.g., 1000).

### Verify GHL Connectivity
1. Submit a test sale and verify the webhook arrives in GHL.
2. Check your browser console for any errors during submisson.
