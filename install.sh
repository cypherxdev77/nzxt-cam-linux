#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
#  nzxtcam-v1 — Install script
#  Tested on Arch Linux / Hyprland
# ─────────────────────────────────────────────

APP="nzxtcam-v1"
BINARY_NAME="nzxtcam-archlinux-rust"
INSTALL_BIN="$HOME/.local/bin/$APP"
ICON_DIR="$HOME/.local/share/icons/hicolor/128x128/apps"
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/$APP.desktop"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${YELLOW}→${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo ""
echo "  nzxtcam-v1 — NZXT Kraken LCD Controller"
echo "  ─────────────────────────────────────────"
echo ""

# ── Dépendances ──────────────────────────────
info "Vérification des dépendances..."
for dep in cargo npm node; do
  command -v "$dep" &>/dev/null || fail "Dépendance manquante : $dep\n  Installe via: sudo pacman -S rust nodejs npm"
done
ok "Dépendances OK"

# ── Build ─────────────────────────────────────
info "Installation des packages Node..."
npm install --silent

info "Compilation en cours (peut prendre 1-2 minutes)..."
npm run tauri build -- --no-bundle 2>&1 | grep -E "Compiling|Finished|error|Built" || true

BINARY="src-tauri/target/release/$BINARY_NAME"
[ -f "$BINARY" ] || fail "Build échoué — binaire introuvable"
ok "Build terminé"

# ── Installation des fichiers ─────────────────
info "Installation du binaire..."
mkdir -p "$HOME/.local/bin"
cp "$BINARY" "$INSTALL_BIN"
chmod +x "$INSTALL_BIN"
ok "Binaire → $INSTALL_BIN"

info "Installation de l'icône..."
mkdir -p "$ICON_DIR"
cp "src-tauri/icons/128x128.png" "$ICON_DIR/$APP.png"
ok "Icône → $ICON_DIR/$APP.png"

info "Création de l'entrée dashboard..."
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_FILE" << DESKTOP
[Desktop Entry]
Name=nzxtcam-v1
GenericName=LCD Controller
Comment=Contrôle l'écran LCD du NZXT Kraken Elite V2
Exec=$INSTALL_BIN
Icon=$APP
Terminal=false
Type=Application
Categories=Utility;System;
Keywords=nzxt;nzxtcam;kraken;lcd;cooling;
StartupWMClass=$BINARY_NAME
DESKTOP
ok "Desktop entry → $DESKTOP_FILE"

# ── Règles USB (udev) ─────────────────────────
info "Installation des règles USB (nécessite sudo)..."
if sudo cp src-tauri/resources/99-nzxt-kraken.rules /etc/udev/rules.d/ 2>/dev/null; then
  sudo udevadm control --reload-rules
  sudo udevadm trigger
  ok "Règles udev installées — accès USB sans sudo"
else
  echo -e "${YELLOW}⚠${NC}  Règles udev non installées (skip sudo)"
  echo "   Pour accéder au Kraken sans sudo, exécute :"
  echo "   sudo cp src-tauri/resources/99-nzxt-kraken.rules /etc/udev/rules.d/"
  echo "   sudo udevadm control --reload-rules && sudo udevadm trigger"
fi

# Ajouter l'utilisateur au groupe plugdev si nécessaire
if ! groups | grep -q plugdev; then
  info "Ajout au groupe plugdev..."
  sudo usermod -aG plugdev "$USER" && ok "Groupe plugdev → reconnecte-toi pour que ça soit effectif" || true
fi

# ── Mise à jour des caches ────────────────────
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache -f "$HOME/.local/share/icons/hicolor" 2>/dev/null || true

# ── Fin ───────────────────────────────────────
echo ""
echo -e "  ${GREEN}Installation terminée !${NC}"
echo "  Lance l'app depuis ton dashboard : nzxtcam-v1"
echo "  Ou via terminal : $APP"
echo ""
