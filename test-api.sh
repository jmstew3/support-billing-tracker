#!/bin/bash

# Test Twenty API
curl -s 'https://twenny.peakonedigital.com/rest/supportTickets' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWJkMDFkZS0zODI4LTQ0NzUtODQwOC1kMDRkMjAyYTNlMGEiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZDliZDAxZGUtMzgyOC00NDc1LTg0MDgtZDA0ZDIwMmEzZTBhIiwiaWF0IjoxNzU4NjQ0MjcxLCJleHAiOjQ5MTIyNDQyNzEsImp0aSI6ImRmMmFjYWNjLTY3NmEtNGFjOS05ODgyLWMzYjE2MzM3MmFmYSJ9.ZZJhf3_0n0y9ZLqwBirBFEq-CnroTTAdhEm-MVptbm0' \
  | python3 -m json.tool