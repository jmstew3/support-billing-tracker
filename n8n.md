# n8n Workflow: Twenty CRM → Thad Chat

This guide shows how to create a new n8n workflow that polls or receives support tickets from the Twenty CRM REST API, transforms them into Billable Requests format, and POSTs each record into your Express backend.

---

## 1. Create or Clone a Workflow

1. Log in to n8n UI at http://localhost:5678.  
2. In the **Workflows** list, locate **“20 → n8n → Thad Chat”** (ID: `jcInkM1TA8fO2Spz`).  
3. Click **Duplicate** to create a new workflow draft.  
4. Rename it to **“20 → n8n → Thad Chat Tickets”**.

---

## 2. Configure Trigger

### Option A: Cron Trigger (Poll API Regularly)
1. Remove the existing **Webhook from Twenty** node.  
2. Add a **Cron** node:  
   - **Mode**: Every 15 minutes (or your chosen interval).  
   - Connect **Cron** → **Get Tickets** (new HTTP Request).

### Option B: Webhook Trigger (CRM Push)
1. If you prefer CRM-initiated events, keep **Webhook from Twenty**.  
2. Ensure your CRM is configured to POST to n8n’s webhook URL (from node’s settings).

---

## 3. Fetch Support Tickets

1. Add an **HTTP Request** node named **Get Tickets**.  
2. **Settings**:
   - **Method**: `POST`  
   - **URL**: `https://twenny.peakonedigital.com/rest/supportTickets`  
   - **Authentication**: Select **API Key** credentials (Name: `CRM-SupportTickets`).  
   - **Headers**:
     - `Content-Type`: `application/json`  
     - `Authorization`: `Bearer <YOUR_CRM_TOKEN>`  
   - **Body Parameters**: (Optional filters, e.g. date range)

3. Connect trigger node → **Get Tickets**.

---

## 4. Map & Transform Data

1. Add a **Function** node named **Map Tickets**.  
2. Connect **Get Tickets** → **Map Tickets**.  
3. Paste this JavaScript in **Function** node:
   ```js
   return items[0].json.supportTickets.map(t => {
     const date = t.fsCreationDate.split('T')[0];
     const day = new Date(date)
       .toLocaleDateString('en-US', { weekday: 'short' });
     const priorityMap = { NORMAL:'Low', MEDIUM:'Medium', CRITICAL:'High' };
     return {
       json: {
         date,
         day,
         description: t.description,
         priority: priorityMap[t.priority],
         hours: null,
         source: 'ticket',
       }
     };
   });
   ```

---

## 5. POST to Express Backend

1. Add another **HTTP Request** node named **Create Request**.  
2. Connect **Map Tickets** → **Create Request** (Main → Main).  
3. **Settings**:
   - **Method**: `POST`  
   - **URL**: `http://backend:3001/api/requests`  
   - **Authentication**: Select **API Key** credentials (Name: `ThadChat-API`).  
   - **Headers**:
     - `Content-Type`: `application/json`  
     - `Authorization`: `Bearer <YOUR_BACKEND_TOKEN>`  
   - **Body**:  
     ```json
     {
       "date": "={{ $json.date }}",
       "time": "00:00:00",
       "category": "Support",
       "description": "={{ $json.description }}",
       "urgency": "={{ $json.priority.toUpperCase() }}",
       "source": "ticket"
     }
     ```
4. Turn on **Split Into Items** so each ticket is sent separately.

---

## 6. Error Handling & Notifications

1. After **Create Request**, add an **Error Trigger** node.  
2. Connect **Error Trigger** → **Email** or **Slack** notification node.  
3. Configure to alert on failures, including error messages and raw payload.

---

## 7. Activate & Test

1. Save and **Activate** the workflow.  
2. Manually execute or wait for the Cron/Webhook to fire.  
3. Check your Express logs or database to verify new ticket entries in `requests` table.

---

## 8. Scheduling

- If using Cron trigger, adjust frequency to match your SLA (e.g., every hour).  
- Monitor n8n’s **Executions** tab for any failures.

---

**Workflow Summary**

- Trigger → Get Tickets (HTTP Request) → Map Tickets (Function) → Create Request (HTTP Request)  
- Optional Error Trigger → Notification  

This setup ensures your React dashboard always has up-to-date ticket data alongside SMS/text requests.
