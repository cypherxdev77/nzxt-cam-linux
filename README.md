# nzxt-cam-linux

Contrôleur LCD & RGB pour le **NZXT Kraken Elite V2** sous Linux.
Alternative native à NZXT CAM (Windows) — construit avec Tauri 2 + Rust.

## Fonctionnalités

- Affichage LCD : image, GIF, températures en temps réel
- Contrôle RGB Ring AIO + ventilateurs
- Monitoring CPU / GPU / liquide / pompe
- Profils sauvegardables avec autostart Hyprland
- Interface sombre native, zéro cloud

## Installation

### Prérequis

```bash
# Arch / Manjaro
sudo pacman -S --needed rust nodejs npm webkit2gtk-4.1 base-devel

# Debian / Ubuntu
sudo apt install -y cargo nodejs npm libwebkit2gtk-4.1-dev build-essential
```

### Installer l'app

```bash
git clone https://github.com/cypherxdev77/nzxt-cam-linux.git
cd nzxt-cam-linux
./install.sh
```

Le script compile le binaire (~1-2 min), installe l'app dans `~/.local/bin/`,
ajoute l'entrée dans ton dashboard et configure l'accès USB sans sudo.

Lance ensuite depuis ton dashboard en cherchant **nzxt-cam-linux**, ou via :

```bash
nzxtcam-v1
```

### Désinstaller

```bash
./uninstall.sh
```

## Devices supportés

| Modèle | PID | Statut |
|--------|-----|--------|
| NZXT Kraken Elite V2 (2024) | `0x3012` | Testé |
| NZXT Kraken Elite 360 | `0x3009` | Non testé |
| NZXT Kraken Elite RGB 360 | `0x300e` | Non testé |
| NZXT Kraken 2023 Elite | `0x300c` | Non testé |

Pour demander le support d'un autre modèle, ouvre une issue ou utilise le bouton « Demander l'accès » dans Paramètres.

## Structure

```
nzxt-cam-linux/
├── src/                       # Frontend React + TypeScript
│   ├── App.tsx                # Layout principal
│   ├── components/            # Composants UI
│   │   └── display/           # Éditeur de scène WYSIWYG
│   ├── hooks/                 # useDevice / useTemperatures / useIPC
│   ├── lib/api.ts             # Wrapper invoke() / listen()
│   ├── shared/                # Types partagés (DisplayConfig, presets)
│   └── styles/
└── src-tauri/                 # Backend Rust
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/          # Permissions Tauri 2
    └── src/
        ├── main.rs / lib.rs   # Entry point + bootstrap
        ├── commands.rs        # #[tauri::command]s exposées au frontend
        ├── usb/
        │   ├── driver.rs      # KrakenDriver (nusb)
        │   └── protocol.rs    # Constantes + helpers du protocole
        ├── render/
        │   ├── scene.rs       # Rendu tiny-skia (gauges, bars, text)
        │   └── fonts.rs       # ab_glyph + chargement police
        ├── sensors/
        │   ├── cpu.rs         # /sys/class/hwmon — k10temp, coretemp...
        │   └── gpu.rs         # /sys/class/hwmon — amdgpu, nvidia, i915
        ├── image_io.rs        # image + gif crates (resize, RGBA)
        ├── config.rs          # Persistance ~/.config/nzxt-cam-linux/
        └── types.rs           # Types partagés (serde rename_all=camelCase)
```

## Détails techniques

### Protocole USB

Le firmware du Kraken Elite attend une séquence très précise :

1. FW query (interrupt OUT) → ACK FW version (interrupt IN)
2. Init `[0x36, 0x03]` → ACK `[0x37, 0x03]`
3. Switch en mode liquide (libère le bucket actif)
4. Boucle de delete buckets jusqu'à code=1
5. Setup bucket avec dimensions
6. Start transfer
7. **Bulk write du header** (12 octets MAGIC + 8 octets bulk_info)
8. **Bulk write des données image** — *séparé* de l'étape 7 (sinon corruption silencieuse)
9. End transfer
10. Switch sur le bucket activé

### Pourquoi nusb plutôt que rusb ?

- **Zéro dépendance système** (rusb nécessite libusb installé)
- Async natif (intégration Tokio)
- Backend Linux direct (ioctls sur `/dev/bus/usb`)
- Mêmes permissions udev que libusb

### Rendu LCD

`tiny-skia` rasterise une scène 640×640 en RGBA :
- Jauges : annular sector via test pixel (angle + radius)
- Barres : rectangles arrondis pleins
- Texte : `ab_glyph` charge une TTF (Inter / DejaVu) et compose les glyphes avec blending

L'alpha est forcé à `0x00` dans le buffer final (exigence firmware).

### Diff-skip anti-clignotement

À chaque tick du mode Températures, une *clé visuelle* est calculée AVANT le rendu :

```
"{configVersion}|{cpu:.d}|{gpu:.d}|{liquid:.d}|{pump}"
```

Si elle ne change pas → pas de rendu, pas de push USB, pas de `switchBucket`. Résultat : zéro saut d'animation sur le LCD physique tant que la valeur affichée n'évolue pas à la précision configurée.

## Dépannage

**« Aucun Kraken Elite trouvé »**
→ Vérifier que la règle udev est installée et que l'utilisateur est dans le groupe `plugdev`. Tester avec `lsusb | grep 1e71`.

**Le device n'est pas détecté après un crash de l'app**
→ Le kernel driver USB est resté détaché. Réattacher :
```bash
python3 -c "import usb.core; d=usb.core.find(idVendor=0x1e71,idProduct=0x3012); d.attach_kernel_driver(1)"
```

**Aucune police trouvée**
→ Installer une police TTF :
```bash
sudo pacman -S ttf-inter      # Arch (préféré)
sudo pacman -S ttf-dejavu     # ou
```

## Limitations connues

| Limitation | Détail |
|---|---|
| **Température liquide** | Affichée à 30 °C fixe — lecture USB du Kraken pas encore implémentée |
| **RPM pompe** | Affiché à 0 — même raison |
| **Preset « nzxt-cam »** | Non porté depuis la version Electron (utilisait un canvas Chromium pour le gradient conique) |
| **Un seul device à la fois** | Pas de support multi-AIO simultané |
| **Drag-drop fichier** | Remplacé par un dialog natif (la webview Tauri bloque les `file://` drag-drop) |

## Licence

MIT — usage libre, modification et redistribution autorisées.

## Crédits

- [liquidctl](https://github.com/liquidctl/liquidctl) — rétro-ingénierie du protocole NZXT Kraken
- [Tauri](https://tauri.app) — framework
- [tiny-skia](https://github.com/RazrFalcon/tiny-skia) — rasterizer 2D pur Rust
- [nusb](https://github.com/kevinmehall/nusb) — USB async pur Rust

---

Développé par **Cypher** pour la communauté Linux 🐧
