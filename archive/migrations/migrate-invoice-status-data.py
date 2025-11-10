#!/usr/bin/env python3
"""
Migrate Invoice Status Data in Twenty CRM

This script updates existing project data to use the new enum values:
- UNPAID → NOT_READY
- DRAFTED → READY
- SENT → INVOICED
- PAID → PAID (unchanged)

IMPORTANT: Run this AFTER updating the schema with update-invoice-status-enum.py

Usage:
    python3 migrate-invoice-status-data.py [--dry-run]
"""

import requests
import json
import sys
import argparse
from typing import List, Dict

# Configuration from .env.docker
API_URL = "https://twenny.peakonedigital.com/rest/projects"
API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMGUxNzllYi1iYzQzLTRhOTctYjM3Ni1kZTc5NGYxMTlhZjYiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiMjBlMTc5ZWItYmM0My00YTk3LWIzNzYtZGU3OTRmMTE5YWY2IiwiaWF0IjoxNzU5MTgyNjAyLCJleHAiOjQ5MTI3ODI2MDEsImp0aSI6ImFlYTBkMzNlLTkwNmEtNDM4Zi1iNTY4LWZkNDQ3YjU5NGIzYSJ9.FLbghDpTW66upHkq1TvOh1DRS83xvSd-qSsKKlSEvyQ"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Mapping: old value → new value
MIGRATION_MAP = {
    "UNPAID": "NOT_READY",
    "DRAFTED": "READY",
    "SENT": "INVOICED",
    "PAID": "PAID"  # No change
}

def fetch_all_projects() -> List[Dict]:
    """Fetch all projects from Twenty CRM"""
    print("📥 Fetching all projects from Twenty CRM...")

    try:
        # Request with high limit to get all projects
        url = f"{API_URL}?limit=500&depth=0"
        response = requests.get(url, headers=headers, timeout=30)

        if response.status_code != 200:
            print(f"❌ HTTP Error {response.status_code}")
            print(f"Response: {response.text}")
            return []

        data = response.json()

        # Handle different response structures
        projects = []
        if isinstance(data, dict):
            if "data" in data and "projects" in data["data"]:
                # GraphQL-style: { data: { projects: [...] } }
                projects = data["data"]["projects"]
            elif "items" in data:
                # Paginated: { items: [...] }
                projects = data["items"]
            else:
                print(f"⚠️  Unexpected response structure: {list(data.keys())}")
                print(f"Full response: {json.dumps(data, indent=2)[:500]}")
                return []
        elif isinstance(data, list):
            # Direct array
            projects = data

        print(f"✅ Fetched {len(projects)} projects")
        return projects

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON response: {e}")
        return []

def analyze_projects(projects: List[Dict]) -> Dict:
    """Analyze which projects need migration"""
    print("\n📊 Analyzing projects...")

    status_counts = {}
    updates_needed = []

    for project in projects:
        project_id = project.get("id")
        project_name = project.get("name", "Unnamed Project")
        old_status = project.get("invoiceStatus")

        # Count status values
        if old_status not in status_counts:
            status_counts[old_status] = 0
        status_counts[old_status] += 1

        # Check if migration needed
        if old_status in MIGRATION_MAP:
            new_status = MIGRATION_MAP[old_status]
            if old_status != new_status:
                updates_needed.append({
                    "id": project_id,
                    "name": project_name,
                    "old": old_status,
                    "new": new_status
                })

    return {
        "status_counts": status_counts,
        "updates_needed": updates_needed
    }

def update_project(project_id: str, new_status: str) -> bool:
    """Update a single project's invoice status"""
    try:
        url = f"{API_URL}/{project_id}"
        payload = {"invoiceStatus": new_status}

        response = requests.patch(url, headers=headers, json=payload, timeout=10)

        if response.status_code in [200, 204]:
            return True
        else:
            print(f"      ❌ HTTP {response.status_code}: {response.text[:100]}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"      ❌ Request failed: {e}")
        return False

def migrate_projects(updates: List[Dict], dry_run: bool = False) -> None:
    """Execute the migration"""
    if not updates:
        print("\n✅ No projects need migration!")
        return

    print(f"\n📝 {len(updates)} projects need migration:")
    for update in updates:
        print(f"   - {update['name'][:50]:<50} | {update['old']} → {update['new']}")

    if dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made")
        print("   Run without --dry-run to execute migration")
        return

    print()
    confirm = input("⚠️  Proceed with migration? This will update project data. (yes/no): ")

    if confirm.lower() != 'yes':
        print("❌ Migration cancelled")
        return

    print("\n🔄 Migrating projects...")
    success_count = 0
    fail_count = 0

    for i, update in enumerate(updates, 1):
        project_name = update['name'][:40]
        print(f"   [{i}/{len(updates)}] {project_name}...", end=" ")

        if update_project(update['id'], update['new']):
            print("✅")
            success_count += 1
        else:
            print("❌")
            fail_count += 1

    print()
    print("=" * 60)
    print(f"✅ Migration complete!")
    print(f"   Successful: {success_count}")
    print(f"   Failed: {fail_count}")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="Migrate invoice status data in Twenty CRM")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying them")
    args = parser.parse_args()

    print("=" * 60)
    print("Twenty CRM: Migrate Invoice Status Data")
    print("=" * 60)
    print()
    print("Migration Map:")
    for old, new in MIGRATION_MAP.items():
        print(f"  {old:<10} → {new}")
    print()
    print("=" * 60)
    print()

    # Fetch projects
    projects = fetch_all_projects()
    if not projects:
        print("❌ No projects fetched. Check API connection and token.")
        sys.exit(1)

    # Analyze what needs migration
    analysis = analyze_projects(projects)

    print("\n📊 Current Status Distribution:")
    for status, count in analysis["status_counts"].items():
        print(f"   {status}: {count} projects")

    # Perform migration
    migrate_projects(analysis["updates_needed"], dry_run=args.dry_run)

    if not args.dry_run and analysis["updates_needed"]:
        print("\n📝 Next steps:")
        print("   1. Verify projects in Twenty CRM UI")
        print("   2. Update frontend code to use new enum values")
        print("   3. Deploy updated frontend")
        print()

if __name__ == "__main__":
    main()