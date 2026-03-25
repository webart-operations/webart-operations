# Step-by-Step GHL Integration & Automation Guide

This guide provides the exact steps to connect your GoHighLevel (GHL) account to the WebArt Ops Platform for two-way synchronization and email alerts.

---

## 🏗️ 1. Connecting GHL to the Platform (Outbound)

The platform already sends data to GHL (e.g., when a sale is submitted). You just need to "catch" it in GHL.

### Steps in GoHighLevel:
1. **Create a Workflow**: Go to **Automation** → **Workflows** → **Create New Workflow** → **Start from Scratch**.
2. **Add Trigger**: Click "Add New Trigger" and search for **"Inbound Webhook"**. 
3. **Copy the URL**: GHL will provide a unique Webhook URL. 
   - *Note: You must paste this URL into your platform's `.env` file as `VITE_GHL_WEBHOOK_URL` and redeploy.*
4. **Test the Trigger**: Click "Fetch Sample Request" in GHL, then submit a test sale from your Platform's Sales Form.
5. **Map to Contact**: Add a "Create/Update Contact" action in your GHL workflow and map the incoming fields (e.g., `client_name` → `Full Name`).

---

## 🔄 2. Syncing Leads from GHL to Platform (Inbound)

When a new lead is created in GHL, let's make it appear in the platform's **Submissions** tab.

### Steps in GoHighLevel:
1. **Create Workflow**: Create a workflow triggered by **"Contact Created"** or **"Form Submitted"**.
2. **Add Action**: Search for the **"Webhook"** action.
3. **Configure Webhook**:
   - **Method**: POST
   - **URL**: `https://<your-supabase-project>.supabase.co/functions/v1/ghl-webhook`
   - **Custom Data**: Send the contact details in the following format:
     ```json
     {
       "type": "contact_created",
       "contact": {
         "first_name": "{{contact.first_name}}",
         "last_name": "{{contact.last_name}}",
         "email": "{{contact.email}}",
         "phone": "{{contact.phone}}",
         "company_name": "{{contact.company_name}}"
       }
     }
     ```

---

## 🗓️ 3. Syncing Appointments (Calendars)

When someone books a call on your GHL calendar, it should show up on the platform's **Meetings** tab.

### Steps in GoHighLevel:
1. **Create Workflow**: Triggered by **"Appointment Status"** (Status: Booked/Confirmed).
2. **Add Action**: Use the **"Webhook"** action again.
3. **URL**: Same as above (`.../ghl-webhook`).
4. **Custom Data**:
   ```json
   {
     "type": "appointment_booked",
     "appointment": {
       "id": "{{appointment.id}}",
       "contact_name": "{{contact.full_name}}",
       "contact_email": "{{contact.email}}",
       "start_time": "{{appointment.start_time}}",
       "timezone": "{{appointment.timezone}}",
       "status": "{{appointment.status}}",
       "user_name": "{{appointment.user.name}}",
       "meeting_link": "{{appointment.meeting_location}}"
     }
   }
   ```

---

## 📧 4. Email Notification Alerts

You can set up internal notifications directly in these GHL workflows.

### Steps in GoHighLevel:
1. **Add Internal Notification**: In any of the workflows above, add an **"Internal Notification"** action.
2. **Type**: Email (or SMS/App Notification).
3. **Recipients**: Select "Particular User" (e.g., the assigned AM) or "Custom Email" (e.g., `admin@webart.technology`).
4. **Content Example**:
   - **Subject**: 🚨 NEW SALE AUDIT REJECTED: {{contact.name}}
   - **Body**: Hi team, a sale for {{contact.name}} has failed the QA audit. Please check the Ops Platform for the audit notes.

---

## 🚀 Final Activation Steps

1. **Deploy the Edge Function**: Run `supabase functions deploy ghl-webhook` in your local terminal.
2. **Secrets**: Ensure your Supabase project has the correct environment variables (URL/Service Key).
3. **Pubilsh**: Always remember to click **"Publish"** on your GHL Workflows!
