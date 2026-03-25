# Automation and GHL Integration Guide

This guide details the outbound webhooks and inbound synchronization flows between the WebArt Ops Platform and GoHighLevel (GHL).

## Outbound: Platform → GHL (Webhooks)

The platform triggers webhooks to GHL at key stages of the sales and fulfillment lifecycle. These are configured in `src/lib/ghl.js`.

### 1. Sale Submitted
- **Trigger**: A Sales Rep submits the `SalesForm.jsx`.
- **Event Type**: `sale_submitted`
- **Payload**:
  - `client_name`: Name of the client
  - `product`: Selected product/service
  - `rep`: Sales representative name
  - `gross`: Total sale amount
  - `currency`: Currency code (USD, GBP, etc.)
- **Action in GHL**: Recommended to create a new Opportunity in the "Sales Pipeline" and send a notification to the sales manager.

### 2. QA Audit — Passed
- **Trigger**: A QA Auditor passes a submission in `AuditQueue.jsx`.
- **Event Type**: `sale_passed_audit`
- **Payload**:
  - `client_name`: Name of the client
  - `assigned_am`: Designated Account Manager
  - `assigned_pm`: Designated Project Manager
- **Action in GHL**: Move Opportunity to "Onboarding" stage and notify the assigned AM/PM.

### 3. QA Audit — Failed
- **Trigger**: A QA Auditor fails a submission in `AuditQueue.jsx`.
- **Event Type**: `sale_failed_audit`
- **Payload**:
  - `client_name`: Name of the client
  - `audit_notes`: Detailed reasons for failure provided by QA
  - `audited_by`: Name of the QA Auditor
- **Action in GHL**: Move Opportunity to "Audit Failed" or "Needs Revision" and notify the Sales Rep.

### 4. Reactivation Requested
- **Trigger**: An AM or PM requests reactivation of a delivered/on-hold project in `Reactivation.jsx`.
- **Event Type**: `reactivation_requested`
- **Payload**:
  - `client_name`: Name of the client
  - `product`: New product/service requested
  - `requested_by`: Name of the AM/PM
- **Action in GHL**: Create a new Opportunity for the existing contact labeled as "Reactivation".

---

## Inbound: GHL → Platform (Sync)

To sync data from GHL back to the platform, you must configure GHL Workflows to POST to your Supabase Edge Functions.

### 1. New Lead Sync
- **GHL Trigger**: Contact Created or Form Submitted.
- **GHL Action**: "Webhook" action pointing to your `ghl-webhook` endpoint.
- **Effect**: Creates a "Pending" record in the platform's `submissions` table for QA to review.

### 2. Meeting/Appointment Sync
- **GHL Trigger**: Appointment status updated (Booked, Confirmed, No-Show).
- **GHL Action**: "Webhook" action with the appointment details.
- **Effect**: Updates the `meetings` table, appearing on the hierarchical calendars for AMs and PMs.

---

## Automation Setup Checklist

> [!IMPORTANT]
> To activate these automations, follow these manual steps:
> 1. **Webhook URL**: In GHL Automation, create a new workflow for each trigger above. Add the "Webhook" step and paste the URL from your `.env` file (`VITE_GHL_WEBHOOK_URL`).
> 2. **Map Fields**: Ensure that the JSON payload keys sent by the platform (e.g., `client_name`) are correctly mapped to your GHL custom fields if you need them saved on the contact record.
> 3. **Edge Functions**: Deploy the Supabase Edge Functions (detailed in the Deployment Guide) to handle inbound sync from GHL.
