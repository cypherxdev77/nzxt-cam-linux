#!/usr/bin/env bash
set -euo pipefail

APP="nzxtcam-v1"
GREEN='\033[0;32m'; NC='\033[0m'
ok() { echo -e "${GREEN}✓${NC} $1"; }

rm -f "$HOME/.local/bin/$APP"
rm -f "$HOME/.local/share/applications/$APP.desktop"
rm -f "$HOME/.local/share/icons/hicolor/128x128/apps/$APP.png"
sudo rm -f /etc/udev/rules.d/99-nzxt-kraken.rules 2>/dev/null && sudo udevadm control --reload-rules || true
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

ok "nzxtcam-v1 désinstallé"
