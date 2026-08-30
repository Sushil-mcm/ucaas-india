#!/usr/bin/env bash
# Install the queue agent service.
#
# NOT RUN. Nothing on any server has been changed by the person who wrote this.
#
#   bash backend-patches/queue-agent-service/apply.sh mcm-switch
#
# The switch asks this service which phone to ring on every single queued call,
# so the script is written to fail safe: it checks before it changes anything,
# it can be run twice with no harm, and it puts the old version back if the
# service does not come up healthy.
set -euo pipefail

HOST="${1:-mcm-switch}"
DIR=/opt/queue-agent-service
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
STAMP=$(date +%Y%m%d-%H%M%S)

say() { printf '\n=== %s\n' "$1"; }

[ -f "$SRC_DIR/queue_agent_service.py" ] || { echo "cannot find the service next to this script"; exit 1; }

say "0/8  Checking the tests pass here first"
python3 "$SRC_DIR/tests/queue_agent_service_test.py" >/dev/null 2>&1 \
  || { echo "tests failed locally -- nothing has been sent to $HOST"; exit 1; }
echo "    tests pass"

say "1/8  Checking what is on $HOST now"
ssh "$HOST" "mkdir -p $DIR && python3 -c 'import pymysql' \
  && echo '    python3 and pymysql are present'"

if ssh "$HOST" "test -f $DIR/queue_agent_service.py"; then
  say "2/8  Backing up the version already there (stamp $STAMP)"
  ssh "$HOST" "cp $DIR/queue_agent_service.py $DIR/queue_agent_service.py.bak-$STAMP && echo '    backed up'"
else
  say "2/8  Nothing there yet, nothing to back up"
fi

say "3/8  Copying the service"
scp -q "$SRC_DIR/queue_agent_service.py" "$HOST:$DIR/queue_agent_service.py"

say "4/8  Settings file"
# The database line is copied from the dialplan service that is already running,
# so the two can never point at different databases.
ssh "$HOST" "if [ -f $DIR/.env ]; then
  echo '    .env already exists, left alone'
else
  DSN=\$(grep '^MYSQL_DSN=' /opt/fs-xml-api-1.2.5/.env | cut -d= -f2-)
  if [ -z \"\$DSN\" ]; then echo '    could not read MYSQL_DSN from the dialplan service'; exit 1; fi
  {
    echo \"MYSQL_DSN=\$DSN\"
    echo 'HTTP_LISTEN_ADDR=127.0.0.1:9006'
    echo 'HTTP_LISTEN_HOST6=::1'
    echo 'BASE_DOMAIN=mycountrymobile.com'
    echo 'LOG_LEVEL=info'
  } > $DIR/.env
  chmod 600 $DIR/.env
  echo '    .env written'
fi"

say "5/8  Service unit"
scp -q "$SRC_DIR/queue-agent-service.service" "$HOST:/etc/systemd/system/queue-agent-service.service"
ssh "$HOST" "systemctl daemon-reload && systemctl enable queue-agent-service >/dev/null 2>&1 && echo '    enabled'"

say "6/8  Starting"
ssh "$HOST" "systemctl restart queue-agent-service && sleep 3 && systemctl is-active queue-agent-service"

say "7/8  Health check"
HEALTH=$(ssh "$HOST" "curl -sS --max-time 5 http://127.0.0.1:9006/health || true")
echo "    $HEALTH"
case "$HEALTH" in
  *'"ok"'*) echo "    healthy" ;;
  *)
    say "NOT HEALTHY -- putting it back"
    ssh "$HOST" "systemctl stop queue-agent-service || true
      if [ -f $DIR/queue_agent_service.py.bak-$STAMP ]; then
        mv $DIR/queue_agent_service.py.bak-$STAMP $DIR/queue_agent_service.py
        systemctl start queue-agent-service
      else
        systemctl disable queue-agent-service || true
      fi"
    echo "rolled back."
    exit 1
    ;;
esac

say "8/8  Asking it a real question"
# An empty agents list here is a good answer, not a failure: it means the
# service is up and simply has nobody free for that queue.
ssh "$HOST" "curl -sS --max-time 5 'http://127.0.0.1:9006/api/callcenter/queues/health-check/agents?strategy=ring-all' | head -c 400; echo"

cat <<EOF

Done on $HOST.

The event manager (esl-manager) runs on both the switch and the API box, and
both ask for this service on their own machine. Run this again with the other
host name to cover the second one.

To undo:
  bash backend-patches/queue-agent-service/rollback.sh $HOST $STAMP
EOF
