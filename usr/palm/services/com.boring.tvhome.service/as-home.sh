#!/bin/sh
# Makes webOS open TV Home wherever it would open LG's home (Home button, Back from apps, startup).
# Runs early at boot from the Homebrew Channel startup folder (/var/lib/webosbrew/init.d/).
# It copies the installed TV Home into RAM, gives the copy LG home's app id, and bind-mounts it over
# LG's home folder. Nothing on disk is changed: to undo, remove the init.d link and restart the TV.
SRC=/media/developer/apps/usr/palm/applications/com.boring.tvhome
DST=/usr/palm/applications/com.webos.app.home
TMP=/tmp/tvhome-as-home
LOG=/tmp/tvhome-as-home.log

[ -f "$SRC/index.html" ] || { echo "TV Home not installed, leaving LG home alone" >"$LOG"; exit 0; }
grep -q " $DST " /proc/mounts && { echo "already mounted" >"$LOG"; exit 0; }

rm -rf "$TMP" && mkdir -p "$TMP" && cp -a "$SRC/." "$TMP/" || exit 0
HIDE='s/"main": *"index.html",/&\n  "visible": false,/' # keep it out of the app list, like LG's home
sed -i 's/"id": *"com.boring.tvhome"/"id": "com.webos.app.home"/; s/"title": *"TV Home"/"title": "Home"/' "$TMP/appinfo.json"
sed -i "$HIDE" "$TMP/appinfo.json"
grep -q '"com.webos.app.home"' "$TMP/appinfo.json" || { echo "appinfo rewrite failed" >"$LOG"; exit 0; }
mount --bind "$TMP" "$DST" && echo "mounted TV Home over $DST" >"$LOG" || exit 0

# Hide the regular TV Home app too, so the app list doesn't show a second TV Home (RAM-only, like the above).
sed "$HIDE" "$SRC/appinfo.json" >/tmp/tvhome-regular-appinfo.json &&
  mount --bind /tmp/tvhome-regular-appinfo.json "$SRC/appinfo.json" && echo "hid regular TV Home" >>"$LOG"

# The app manager (sam) read the app list before this ran and still thinks home is LG's Flutter app.
# Restart it so it re-reads com.webos.app.home from the mount (systemd brings it straight back).
systemctl restart sam >>"$LOG" 2>&1 && echo "restarted sam" >>"$LOG"

# Start the TV Home service: it opens the home app (now TV Home) at boot, so the TV doesn't start on the
# Live TV no-signal screen, and on every Home press, which native apps like Netflix don't pass to the system.
SVC=/media/developer/apps/usr/palm/services/com.boring.tvhome.service/autostart.sh
[ -f "$SVC" ] && sh "$SVC" </dev/null >/dev/null 2>&1 && echo "started TV Home service" >>"$LOG"

# After a power cut webOS shows the "last input" first (often Live TV: "Not Programmed" without an antenna)
# until this script can run, ~50s in. Point the last input at TV Home so the next boot shows TV Home's
# loading screen instead. The original value is saved once (see the README to restore it).
ORIG=/var/lib/webosbrew/tvhome-last-input.orig
if [ ! -f "$ORIG" ]; then
  luna-send -n 1 -w 5000 luna://com.webos.settingsservice/getSystemSettings \
    '{"category":"general","keys":["lastInputApp","physicalLastInputApp","homeAutoLaunch"]}' >"$ORIG" 2>/dev/null
fi
# Home Auto Launch off too: when power returns at the plug, webOS otherwise plays its boot animation and then
# opens LG's own home (before this script can swap it in). Off, every boot goes black -> TV Home's loading screen.
# The trade-off: no webOS boot animation.
luna-send -n 1 -w 5000 luna://com.webos.settingsservice/setSystemSettings \
  '{"category":"general","settings":{"lastInputApp":"com.boring.tvhome","physicalLastInputApp":"com.boring.tvhome","homeAutoLaunch":"off"}}' >/dev/null 2>&1 &&
  echo "boot input set to TV Home" >>"$LOG"
exit 0
