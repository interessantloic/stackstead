#!/bin/sh
set -eu

# Configure these through the scheduler environment, never hard-code the token
# in a copy committed to source control.
: "${STACKSTEAD_REPORT_URL:?Set STACKSTEAD_REPORT_URL, for example https://stackstead.example/api/ipv6/report}"
: "${STACKSTEAD_DEVICE_TOKEN:?Set STACKSTEAD_DEVICE_TOKEN to the token shown for this device}"

timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# Preserve the behavior of the original n8n reporter: prefer stable global
# addresses and fall back to every global address when the strict set is empty.
addresses="$({
  ip -6 addr show scope global 2>/dev/null \
    | awk '
        /inet6 / {
          if ($0 ~ / temporary /) next
          if ($0 ~ / deprecated /) next
          if ($0 ~ / mngtmpaddr /) next
          print $2
        }
      ' \
    | cut -d/ -f1 \
    | sort -u
} || true)"

if [ -z "$addresses" ]; then
  addresses="$({
    ip -6 addr show scope global 2>/dev/null \
      | awk '/inet6 / {print $2}' \
      | cut -d/ -f1 \
      | sort -u
  } || true)"
fi

primary_ipv6="$(printf '%s\n' "$addresses" | awk 'NF { print; exit }')"
ipv6_json="$(
  printf '%s\n' "$addresses" \
    | awk 'NF { printf("%s\"%s\"", count++ ? "," : "", $0) }'
)"

payload="$(printf '{\"timestamp\":\"%s\",\"primary_ipv6\":\"%s\",\"ipv6_list\":[%s]}' \
  "$timestamp" "$primary_ipv6" "$ipv6_json")"

curl --fail --silent --show-error \
  --request POST "$STACKSTEAD_REPORT_URL" \
  --header "Authorization: Bearer $STACKSTEAD_DEVICE_TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$payload"
printf '\n'
