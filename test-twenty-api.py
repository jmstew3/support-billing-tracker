#!/usr/bin/env python3
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env.docker
# To use: Set VITE_TWENTY_API_TOKEN in .env.docker
load_dotenv('.env.docker')

# API Configuration
API_URL = os.getenv('VITE_TWENTY_API_URL', 'https://twenny.peakonedigital.com/rest/supportTickets')
API_TOKEN = os.getenv('VITE_TWENTY_API_TOKEN')

if not API_TOKEN:
    print("❌ ERROR: VITE_TWENTY_API_TOKEN not found in environment variables")
    print("Please set VITE_TWENTY_API_TOKEN in .env.docker file")
    exit(1)

print("Testing Twenty API...")
print(f"URL: {API_URL}")
print("-" * 50)

# Try different authentication methods
auth_methods = [
    ("Bearer Token", {"Authorization": f"Bearer {API_TOKEN}"}),
    ("Direct Token", {"Authorization": API_TOKEN}),
    ("X-Api-Token", {"X-Api-Token": API_TOKEN}),
    ("Api-Token", {"Api-Token": API_TOKEN}),
]

for method_name, headers in auth_methods:
    print(f"\nTrying {method_name}...")
    headers["Content-Type"] = "application/json"

    try:
        response = requests.get(API_URL, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS with {method_name}!")

            # Try to parse the response structure
            if isinstance(data, dict):
                if "data" in data and "supportTickets" in data["data"]:
                    tickets = data["data"]["supportTickets"]
                    print(f"Found {len(tickets)} tickets")
                    if tickets:
                        print(f"First ticket: {json.dumps(tickets[0], indent=2)[:200]}...")
                elif "items" in data:
                    print(f"Found {len(data['items'])} items")
                else:
                    print(f"Response structure: {list(data.keys())}")
            elif isinstance(data, list):
                print(f"Found {len(data)} tickets (array response)")
                if data:
                    print(f"First ticket: {json.dumps(data[0], indent=2)[:200]}...")
            break
        else:
            error_text = response.text[:200]
            print(f"Error: {error_text}")

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
    except json.JSONDecodeError as e:
        print(f"Invalid JSON response: {e}")
        print(f"Response text: {response.text[:200]}")

print("\n" + "=" * 50)
print("Test complete!")