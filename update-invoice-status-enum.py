#!/usr/bin/env python3
"""
Update Invoice Status Enum in Twenty CRM

This script updates the invoiceStatus field in the Projects object to use new enum values:
- UNPAID → NOT_READY
- DRAFTED → READY
- SENT → INVOICED
- PAID → PAID (unchanged)

Usage:
    python3 update-invoice-status-enum.py
"""

import requests
import json
import sys

# Configuration from .env.docker
API_URL = "https://twenny.peakonedigital.com/graphql"
API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMGUxNzllYi1iYzQzLTRhOTctYjM3Ni1kZTc5NGYxMTlhZjYiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiMjBlMTc5ZWItYmM0My00YTk3LWIzNzYtZGU3OTRmMTE5YWY2IiwiaWF0IjoxNzU5MTgyNjAyLCJleHAiOjQ5MTI3ODI2MDEsImp0aSI6ImFlYTBkMzNlLTkwNmEtNDM4Zi1iNTY4LWZkNDQ3YjU5NGIzYSJ9.FLbghDpTW66upHkq1TvOh1DRS83xvSd-qSsKKlSEvyQ"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Step 1: Query to find the invoiceStatus field metadata
query_field = """
query GetFieldMetadata {
  fieldMetadataItems(filter: { name: { eq: "invoiceStatus" } }) {
    edges {
      node {
        id
        name
        type
        label
        options
        objectMetadataId
      }
    }
  }
}
"""

# Step 2: Mutation to update the enum options
mutation_update = """
mutation UpdateInvoiceStatusEnum($fieldId: ID!) {
  updateOneFieldMetadataItem(
    input: {
      id: $fieldId
      update: {
        options: [
          { value: "NOT_READY", label: "Not Ready", color: "gray", position: 0 },
          { value: "READY", label: "Ready", color: "blue", position: 1 },
          { value: "INVOICED", label: "Invoiced", color: "yellow", position: 2 },
          { value: "PAID", label: "Paid", color: "green", position: 3 }
        ]
      }
    }
  ) {
    id
    name
    label
    options
  }
}
"""

def execute_graphql(query, variables=None):
    """Execute a GraphQL query against Twenty CRM API"""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=30)

        if response.status_code != 200:
            print(f"❌ HTTP Error {response.status_code}")
            print(f"Response: {response.text}")
            return None

        result = response.json()

        # Check for GraphQL errors
        if "errors" in result:
            print(f"❌ GraphQL Errors:")
            for error in result["errors"]:
                print(f"   - {error.get('message', 'Unknown error')}")
            return None

        return result

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON response: {e}")
        print(f"Response text: {response.text[:500]}")
        return None

def main():
    print("=" * 60)
    print("Twenty CRM: Update Invoice Status Enum Values")
    print("=" * 60)
    print()
    print("Old Values → New Values:")
    print("  UNPAID   → NOT_READY")
    print("  DRAFTED  → READY")
    print("  SENT     → INVOICED")
    print("  PAID     → PAID (unchanged)")
    print()
    print("=" * 60)
    print()

    # Step 1: Find the invoiceStatus field
    print("🔍 Step 1: Finding invoiceStatus field metadata...")
    result = execute_graphql(query_field)

    if not result:
        print("❌ Failed to query field metadata")
        print("\n💡 Tip: This might mean:")
        print("   - Twenty CRM doesn't use GraphQL for metadata updates")
        print("   - The field name is different")
        print("   - API token lacks permissions")
        print("\n🔧 Alternative: Update manually in Twenty CRM UI:")
        print("   Settings → Data Model → Objects → Projects → invoiceStatus field")
        sys.exit(1)

    # Parse response
    edges = result.get("data", {}).get("fieldMetadataItems", {}).get("edges", [])

    if not edges:
        print("❌ invoiceStatus field not found")
        print("\n📋 Full response:")
        print(json.dumps(result, indent=2))
        sys.exit(1)

    field = edges[0]["node"]
    field_id = field["id"]
    field_name = field["name"]
    field_label = field.get("label", "")
    current_options = field.get("options", [])

    print(f"✅ Found field:")
    print(f"   ID: {field_id}")
    print(f"   Name: {field_name}")
    print(f"   Label: {field_label}")
    print(f"   Current options:")
    for opt in current_options:
        print(f"      - {opt.get('value', 'N/A')}: {opt.get('label', 'N/A')}")
    print()

    # Step 2: Confirm update
    print("⚠️  WARNING: This will update the enum values for ALL projects.")
    print("   Make sure you run the data migration script AFTER this.")
    print()
    confirm = input("Proceed with schema update? (yes/no): ")

    if confirm.lower() != 'yes':
        print("❌ Update cancelled")
        sys.exit(0)

    print()
    print("🔄 Step 2: Updating field metadata...")

    update_result = execute_graphql(mutation_update, {"fieldId": field_id})

    if not update_result:
        print("❌ Failed to update field metadata")
        print("\n🔧 Try updating manually in Twenty CRM UI:")
        print("   Settings → Data Model → Objects → Projects → invoiceStatus field")
        sys.exit(1)

    # Display updated field
    updated_field = update_result.get("data", {}).get("updateOneFieldMetadataItem", {})
    updated_options = updated_field.get("options", [])

    print("✅ Field updated successfully!")
    print(f"   New options:")
    for opt in updated_options:
        print(f"      - {opt.get('value', 'N/A')}: {opt.get('label', 'N/A')}")
    print()

    print("=" * 60)
    print("✅ Schema update complete!")
    print()
    print("📝 Next steps:")
    print("   1. Verify in Twenty CRM UI:")
    print("      Settings → Data Model → Objects → Projects")
    print("   2. Run data migration script:")
    print("      python3 migrate-invoice-status-data.py")
    print("   3. Update frontend code (follow plan)")
    print("=" * 60)

if __name__ == "__main__":
    main()