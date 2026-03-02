#!/bin/sh
input=$(cat)

cwd=$(echo "$input" | jq -r '.cwd // .workspace.current_dir // ""')

total=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
input_tokens=$(echo "$input" | jq -r '.context_window.current_usage.input_tokens // empty')

if [ -n "$input_tokens" ] && [ "$total" -gt 0 ]; then
  printf "\033[2m%s\033[0m  \033[2m[ctx: %s / %s tokens]\033[0m" "$cwd" "$input_tokens" "$total"
elif [ -n "$used_pct" ] && [ "$total" -gt 0 ]; then
  printf "\033[2m%s\033[0m  \033[2m[ctx: %s%% of %s tokens]\033[0m" "$cwd" "$used_pct" "$total"
else
  printf "\033[2m%s\033[0m" "$cwd"
fi
