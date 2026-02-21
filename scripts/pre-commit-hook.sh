#!/bin/bash
#
# Pre-commit hook to prevent committing sensitive files
#
# Installation:
#   cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or use a symbolic link (updates automatically):
#   ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit
#

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Files that should never be committed
BLOCKED_PATTERNS=(
    "^\.env$"
    "^\.env\."
    "\.env\.local$"
    "\.env\.production$"
    "credentials\.json$"
    "secrets\.json$"
    "\.pem$"
    "\.key$"
)

# Check staged files against blocked patterns
BLOCKED_FILES=()

for pattern in "${BLOCKED_PATTERNS[@]}"; do
    while IFS= read -r file; do
        if [[ -n "$file" && "$file" != ".env.example" ]]; then
            BLOCKED_FILES+=("$file")
        fi
    done < <(git diff --cached --name-only | grep -E "$pattern" 2>/dev/null)
done

# If any blocked files found, abort commit
if [[ ${#BLOCKED_FILES[@]} -gt 0 ]]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  COMMIT BLOCKED - SENSITIVE FILES DETECTED${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}The following files contain sensitive data and cannot be committed:${NC}"
    echo ""
    for file in "${BLOCKED_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "To remove these files from staging:"
    echo "  git reset HEAD ${BLOCKED_FILES[*]}"
    echo ""
    echo "If you MUST commit these files (not recommended):"
    echo "  git commit --no-verify"
    echo ""
    echo -e "${RED}WARNING: Committing credentials exposes them in git history forever!${NC}"
    exit 1
fi

# Check for potential secrets in staged file contents
SECRETS_FOUND=false
SUSPICIOUS_FILES=()

while IFS= read -r file; do
    # Skip binary files and certain extensions
    if [[ "$file" =~ \.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|pdf|zip|tar|gz)$ ]]; then
        continue
    fi

    # Check for common secret patterns in staged content
    STAGED_CONTENT=$(git show ":$file" 2>/dev/null)
    if echo "$STAGED_CONTENT" | grep -qE "(password|secret|api_key|apikey|token|credential)\s*[:=]\s*['\"][^'\"]{8,}['\"]" 2>/dev/null; then
        SUSPICIOUS_FILES+=("$file")
        SECRETS_FOUND=true
    fi
done < <(git diff --cached --name-only)

if [[ "$SECRETS_FOUND" == true ]]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}  WARNING - POTENTIAL SECRETS DETECTED${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo "The following files may contain hardcoded secrets:"
    echo ""
    for file in "${SUSPICIOUS_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "Please review these files before committing."
    echo "Consider using environment variables instead of hardcoded values."
    echo ""
    # Warning only - don't block commit for potential secrets
fi

exit 0
