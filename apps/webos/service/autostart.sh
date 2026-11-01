#!/bin/sh
# Homebrew Channel startup hook (symlinked into /var/lib/webosbrew/init.d/). Starts the TV Home
# service, which opens TV Home at boot and on every Home press. Returns at once so boot isn't
# blocked. To undo: remove the symlink, or uninstall TV Home. No system files are changed.
SVCDIR=/media/developer/apps/usr/palm/services/com.boring.tvhome.service
[ -f "$SVCDIR/service.js" ] || exit 0
[ -f /tmp/tvhome-svc.pid ] && kill -9 "$(cat /tmp/tvhome-svc.pid)" 2>/dev/null
export NODE_PATH=/usr/lib/node_modules:/usr/lib/nodejs
cd "$SVCDIR"
nohup /usr/bin/node service.js --boot --watch >/tmp/tvhome-svc.stdout 2>&1 &
exit 0
