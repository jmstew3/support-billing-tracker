# Invoice Status Enum Migration Guide

## Overview

This guide walks through updating the `invoiceStatus` field enum values in Twenty CRM's Projects object.

**Migration**:
- `UNPAID` → `NOT_READY`
- `DRAFTED` → `READY`
- `SENT` → `INVOICED`
- `PAID` → `PAID` (unchanged)

## Prerequisites

- Python 3.x installed
- `requests` library: `pip3 install requests`
- Access to Twenty CRM with API token (stored in `.env.docker`)
- Backup of Twenty CRM database (recommended)

---

## Step-by-Step Migration Process

### Step 1: Update Schema in Twenty CRM

This updates the field metadata to define the new enum values.

```bash
cd /share/Coding/Docker/thad-chat
python3 update-invoice-status-enum.py
```

**What it does**:
- Connects to Twenty CRM GraphQL API
- Finds the `invoiceStatus` field metadata
- Updates enum options to new values
- Displays confirmation of changes

**Expected output**:
```
==============================================================
Twenty CRM: Update Invoice Status Enum Values
==============================================================

Old Values → New Values:
  UNPAID   → NOT_READY
  DRAFTED  → READY
  SENT     → INVOICED
  PAID     → PAID (unchanged)

==============================================================

🔍 Step 1: Finding invoiceStatus field metadata...
✅ Found field:
   ID: abc123...
   Name: invoiceStatus
   Label: Invoice Status
   Current options:
      - UNPAID: Unpaid
      - PAID: Paid

⚠️  WARNING: This will update the enum values for ALL projects.
   Make sure you run the data migration script AFTER this.

Proceed with schema update? (yes/no): yes

🔄 Step 2: Updating field metadata...
✅ Field updated successfully!
   New options:
      - NOT_READY: Not Ready
      - READY: Ready
      - INVOICED: Invoiced
      - PAID: Paid

==============================================================
✅ Schema update complete!

📝 Next steps:
   1. Verify in Twenty CRM UI:
      Settings → Data Model → Objects → Projects
   2. Run data migration script:
      python3 migrate-invoice-status-data.py
   3. Update frontend code (follow plan)
==============================================================
```

**Verification**:
1. Log into Twenty CRM: https://twenny.peakonedigital.com
2. Navigate to: Settings → Data Model → Objects → Projects
3. Click on `invoiceStatus` field
4. Verify enum options show: NOT_READY, READY, INVOICED, PAID

---

### Step 2: Migrate Existing Data

This updates all existing projects to use the new enum values.

**DRY RUN (Recommended First)**:
```bash
python3 migrate-invoice-status-data.py --dry-run
```

This shows what would be changed without actually modifying data.

**Execute Migration**:
```bash
python3 migrate-invoice-status-data.py
```

**What it does**:
- Fetches all projects from Twenty CRM
- Identifies projects with old enum values
- Shows preview of changes
- Prompts for confirmation
- Updates each project with new value

**Expected output**:
```
==============================================================
Twenty CRM: Migrate Invoice Status Data
==============================================================

Migration Map:
  UNPAID     → NOT_READY
  DRAFTED    → READY
  SENT       → INVOICED
  PAID       → PAID

==============================================================

📥 Fetching all projects from Twenty CRM...
✅ Fetched 127 projects

📊 Analyzing projects...

📊 Current Status Distribution:
   UNPAID: 45 projects
   DRAFTED: 12 projects
   SENT: 8 projects
   PAID: 62 projects

📝 65 projects need migration:
   - Project Alpha                                      | UNPAID → NOT_READY
   - Project Beta                                       | DRAFTED → READY
   - Project Gamma                                      | SENT → INVOICED
   ...

⚠️  Proceed with migration? This will update project data. (yes/no): yes

🔄 Migrating projects...
   [1/65] Project Alpha... ✅
   [2/65] Project Beta... ✅
   [3/65] Project Gamma... ✅
   ...

==============================================================
✅ Migration complete!
   Successful: 65
   Failed: 0
==============================================================

📝 Next steps:
   1. Verify projects in Twenty CRM UI
   2. Update frontend code to use new enum values
   3. Deploy updated frontend
```

**Verification**:
1. Log into Twenty CRM
2. Navigate to Projects
3. Open a few projects and check `invoiceStatus` values
4. Verify no projects have old enum values (UNPAID, DRAFTED, SENT)

---

### Step 3: Deploy Frontend Changes

The frontend code has already been updated in this repository. Deploy it:

**Using Docker**:
```bash
cd /share/Coding/Docker/thad-chat
docker-compose up -d --build frontend
```

**Local Development**:
```bash
cd /share/Coding/Docker/thad-chat/frontend
npm run build
npm run dev
```

**Files Updated**:
- `frontend/src/types/project.ts` - TypeScript enum types
- `frontend/src/services/projectsApi.ts` - Status checks
- `frontend/src/components/Projects.tsx` - Filter dropdown
- `frontend/src/components/ProjectCard.tsx` - Status badges

---

## Troubleshooting

### Schema Update Fails

**Error**: `GraphQL Errors: Field not found` or `HTTP 401 Unauthorized`

**Solutions**:
1. Verify API token is correct in `.env.docker`
2. Check token has permissions for schema updates
3. Try manual update in Twenty CRM UI:
   - Settings → Data Model → Objects → Projects
   - Edit `invoiceStatus` field
   - Update enum options manually

### Data Migration Fails

**Error**: Some projects fail to update

**Solutions**:
1. Check error messages for specific project IDs
2. Manually update failed projects in Twenty CRM UI
3. Re-run migration (it will skip already-migrated projects)

### Frontend Shows Wrong Status

**Issue**: Projects still show "UNPAID" instead of "NOT READY"

**Solutions**:
1. Clear browser cache and hard refresh (Cmd+Shift+R)
2. Verify frontend code was deployed
3. Check browser console for errors
4. Restart frontend container: `docker-compose restart frontend`

---

## Rollback Plan

### If Schema Update Needs Reverting:

**Option A: Manual Revert in UI**
1. Twenty CRM → Settings → Data Model → Projects
2. Edit `invoiceStatus` field
3. Change enum values back to: UNPAID, DRAFTED, SENT, PAID

**Option B: Script Revert** (create if needed)
```python
# Reverse the migration in update-invoice-status-enum.py
# Change new values back to old values
```

### If Data Migration Needs Reverting:

**Manual Approach**:
1. Export projects to CSV before migration (recommended)
2. Use CSV import to restore original values

**Script Approach**:
Modify `migrate-invoice-status-data.py` with reverse mapping:
```python
MIGRATION_MAP = {
    "NOT_READY": "UNPAID",
    "READY": "DRAFTED",
    "INVOICED": "SENT",
    "PAID": "PAID"
}
```

### If Frontend Breaks:

```bash
git revert <commit_hash>
docker-compose up -d --build frontend
```

---

## Testing Checklist

### After Schema Update:
- [ ] Twenty CRM UI shows new enum values
- [ ] Old enum values removed from dropdown
- [ ] Can create test project with new status values

### After Data Migration:
- [ ] All projects have valid invoiceStatus
- [ ] No projects with old enum values (UNPAID, DRAFTED, SENT)
- [ ] Project counts match expected (65 migrated in example)
- [ ] Random spot check of 10 projects

### After Frontend Deployment:
- [ ] Projects page loads without errors
- [ ] Filter dropdown shows: Not Ready, Ready, Invoiced, Paid
- [ ] Default view shows "READY" projects
- [ ] All filter options work correctly
- [ ] ProjectCard shows colored status badges
- [ ] No console errors in browser

---

## Support

If you encounter issues:

1. Check script output for specific error messages
2. Verify Twenty CRM API token has correct permissions
3. Test with `--dry-run` flag before executing migrations
4. Manually verify changes in Twenty CRM UI
5. Contact Twenty CRM support if API issues persist

---

## Files Reference

### Migration Scripts:
- `update-invoice-status-enum.py` - Schema update
- `migrate-invoice-status-data.py` - Data migration

### Frontend Files:
- `frontend/src/types/project.ts` - Type definitions
- `frontend/src/services/projectsApi.ts` - API logic
- `frontend/src/components/Projects.tsx` - Filter UI
- `frontend/src/components/ProjectCard.tsx` - Status display

### Documentation:
- `CLAUDE.md` - Full project documentation
- `INVOICE_STATUS_MIGRATION_README.md` - This file