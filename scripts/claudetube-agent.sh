#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INBOX="$ROOT/.claudetube/inbox.json"

mkdir -p "$(dirname "$INBOX")"

usage() {
  cat <<'EOF'
Usage:
  claudetube-agent.sh play <youtube-url-or-id>
  claudetube-agent.sh enqueue <youtube-url-or-id>
  claudetube-agent.sh toggle
  claudetube-agent.sh next
  claudetube-agent.sh skip
  claudetube-agent.sh mute
  claudetube-agent.sh seek <seconds>
  claudetube-agent.sh show
  claudetube-agent.sh clear
  claudetube-agent.sh layout <compact|theater|mini>
  claudetube-agent.sh speed <0.25-2>
EOF
}

write_inbox() {
  node - "$INBOX" "$1" <<'NODE'
const fs = require("node:fs");
const [, , inboxPath, payload] = process.argv;
fs.writeFileSync(inboxPath, payload);
NODE
}

json() {
  node -e 'console.log(JSON.stringify(JSON.parse(process.argv[1])))' "$1"
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

cmd="$1"
shift

case "$cmd" in
  play)
    [[ $# -ge 1 ]] || { usage; exit 1; }
    write_inbox "$(node -e 'console.log(JSON.stringify({action:"play",url:process.argv[1]}))' "$1")"
    ;;
  enqueue)
    [[ $# -ge 1 ]] || { usage; exit 1; }
    write_inbox "$(node -e 'console.log(JSON.stringify({action:"enqueue",url:process.argv[1]}))' "$1")"
    ;;
  toggle)
    write_inbox '{"action":"toggle"}'
    ;;
  next|skip)
    write_inbox '{"action":"next"}'
    ;;
  mute)
    write_inbox '{"action":"mute"}'
    ;;
  seek)
    [[ $# -ge 1 ]] || { usage; exit 1; }
    write_inbox "$(node -e 'console.log(JSON.stringify({action:"seek",seconds:Number(process.argv[1])}))' "$1")"
    ;;
  show)
    write_inbox '{"action":"show"}'
    ;;
  clear)
    write_inbox '{"action":"clearQueue"}'
    ;;
  layout)
    [[ $# -ge 1 ]] || { usage; exit 1; }
    write_inbox "$(node -e 'console.log(JSON.stringify({action:"setLayout",layout:process.argv[1]}))' "$1")"
    ;;
  speed)
    [[ $# -ge 1 ]] || { usage; exit 1; }
    write_inbox "$(node -e 'console.log(JSON.stringify({action:"setPlaybackRate",rate:Number(process.argv[1])}))' "$1")"
    ;;
  *)
    usage
    exit 1
    ;;
esac

echo "ClaudeTube command written to $INBOX"
