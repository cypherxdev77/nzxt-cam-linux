#!/usr/bin/env bash
# Fix fan control permissions for NZXT CAM v1
# Run with: sudo ./fix-fan-permissions.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$EUID" -ne 0 ]; then
  echo "✗ Ce script doit être lancé avec sudo"
  echo "  sudo ./fix-fan-permissions.sh"
  exit 1
fi

echo "→ Installation de la règle udev..."
cp "$SCRIPT_DIR/src-tauri/resources/99-nzxt-kraken.rules" /etc/udev/rules.d/
echo "✓ /etc/udev/rules.d/99-nzxt-kraken.rules"

echo "→ Rechargement des règles udev..."
udevadm control --reload-rules
udevadm trigger --subsystem-match=hwmon
echo "✓ udev rechargé"

echo "→ Application immédiate des permissions (sans reboot)..."
fixed=0
for h in /sys/class/hwmon/hwmon*; do
  name=$(cat "$h/name" 2>/dev/null || echo "")
  case "$name" in
    amdgpu|it87|nct6775|nct6776|nct6779)
      for f in "$h"/pwm[0-9] "$h"/pwm[0-9]_enable "$h"/fan[0-9]_target; do
        if [ -f "$f" ]; then
          chmod a+rw "$f"
          fixed=$((fixed + 1))
        fi
      done
      echo "  ✓ $name ($h)"
      ;;
  esac
done

echo ""
echo "✓ $fixed fichiers PWM rendus accessibles en écriture"
echo ""
echo "Vérification :"
ls -l /sys/class/hwmon/hwmon*/pwm1 2>/dev/null | sed 's|^|  |'
echo ""
echo "Relance l'app nzxtcam-v1 pour tester le contrôle des ventilateurs."
