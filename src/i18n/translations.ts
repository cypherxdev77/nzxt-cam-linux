export type Lang = 'en' | 'fr'

export const translations = {
  en: {
    // CloseDialog
    close_title: 'Close window?',
    close_sub: 'The app can keep running in the background and maintain RGB + LCD control.',
    close_bg: 'Keep in background',
    close_quit: 'Quit completely',

    // Settings — tabs
    tab_general: 'General',
    tab_profiles: 'Profiles',
    tab_support: 'Support',

    // Settings — General
    accent_color: 'Accent color',
    temp_unit: 'Temperature unit',
    compact_sidebar: 'Compact sidebar',
    compact_sidebar_sub: 'Show icons only',
    autostart: 'Launch at startup',
    autostart_on: 'App starts automatically with your session',
    autostart_off: 'App does not start automatically',

    // Settings — Support
    support_github: 'GitHub Repository',
    support_github_sub: 'Source code, issues & contributions',
    support_bug: 'Report a bug',
    support_bug_sub: 'Open a GitHub issue',
    support_reddit: 'Reddit r/NZXT',
    support_reddit_sub: 'NZXT community',
    support_donate_title: 'Support the project',
    support_donate_sub: 'Free and open-source. Share it or donate crypto to support development.',
    copy: 'Copy',
    copied: 'Copied',

    // AppHeader / device
    not_connected: 'Not connected',
    not_detected: 'Not detected',

    // LCD Screen
    lcd_apply: 'Apply to LCD',
    lcd_applied: 'Applied to LCD',
    lcd_sending: 'Sending…',
    lcd_not_available: 'LCD not available — check device connection',
    device_not_connected: 'Device not connected',
    device_not_controllable: 'Device not controllable',

    // Display Editor
    loading_editor: 'Loading editor…',
    templates: 'Templates',
    elements: 'Elements',
    properties: 'Properties',
    no_elements: 'No elements',
    apply_error: '✕ Error — retry',
    select_element: 'Select an element (handle on preview or list on the left) to edit it.',

    // Element Inspector
    metric: 'Metric',
    start_angle: 'Start angle',
    color: 'Color',
    alert_color: 'Alert color',
    track_color: 'Track color',
    align_center: 'Centered',

    // Lighting
    speed_slowest: 'Slowest',
    speed_slower: 'Slow',
    speed_normal: 'Normal',
    speed_faster: 'Fast',
    speed_fastest: 'Max',
    ch_fans: 'Fans',
    ch_all: 'All',
    ch_all_hint: 'All channels',
    ch_fans_hint: 'Fans / accessories',
    color_label: 'Color',
    colors_label: 'Colors',
    apply: 'Apply',
    applied: 'Applied',

    // Ring control
    fx_off: 'Off',
    fx_off_desc: 'LEDs off',
    fx_fixed: 'Fixed',
    fx_fixed_desc: 'Static color',
    fx_fading: 'Fading',
    fx_fading_desc: 'Multi-color transition',
    fx_rainbow_pulse_desc: 'Pulsing rainbow',
    fx_marquee_desc: 'Rotating color',
    ring_tip: 'Try ⭕ Ring AIO for the white ring around the LCD screen',

    // Cooling
    preset_balanced: 'Balanced',
    preset_readonly: '(read-only — preset profile)',
    gpu_control_sub: 'Control via hwmon · GPU temp source',
    cpu_control_sub: 'Control via hwmon · CPU temp source',
    udev_missing: 'Missing udev rule — re-run',
    udev_reboot: 'with sudo then reboot',
    case_fans: 'Case Fans',
    channels_detected_one: 'channel detected',
    channels_detected_many: 'channels detected',
    no_fans: 'No fans detected via hwmon',
    watercooling_sub: 'Watercooling · CPU & liquid control',
    edit_curve_hint: 'Switch to Manual mode to edit the curve',
    gpu_fans_title: 'GPU — Independent fans',
    gpu_fans_sub: 'The GPU has its own fans managed by the graphics driver. They are not part of the Kraken watercooling circuit and cannot be controlled here.',
    manual_mode: 'Manual',

    // Mode Selector
    mode_temperatures: 'Temperatures',

    // Media Uploader
    click_file: 'Click to select a file',
    uploading: 'Uploading…',
    start_temp: 'Start Temperature mode',
    starting: 'Starting…',

    // Profile Manager
    saved_profiles: 'Saved profiles',
    no_profiles: 'Create a profile to save your configuration',
    saved_msg: 'saved',
    applied_msg: 'applied',
    deleted_msg: 'deleted',
    profile_mode_temp: 'Temperatures',
    profile_mode_none: 'LCD unchanged',
    profile_autostart_hint: 'Add to',
    profile_autostart_for: 'to launch a profile at startup',

    // Monitoring
    approx_data: '* Approximate data',
    cpu_temp_sub: 'CPU temperature',
    gpu_temp_sub: 'GPU temperature',
    liquid_temp_sub: 'Liquid coolant temperature',

    // Advanced settings
    polling_title: 'Polling & precision',
    polling_desc: 'Controls the sensor read frequency and LCD refresh rate.',
    lcd_render_label: 'LCD render (ms)',
    lcd_render_help: 'Scene render frequency. USB push only happens when the image changes.',
    lcd_cooldown_label: 'LCD push cooldown (ms)',
    lcd_cooldown_help: 'Minimum delay between 2 USB sends. 0 = none.',
    decimals_label: 'Displayed decimals',
    gpu_source_title: 'GPU source',
    gpu_source_desc: 'Select the GPU whose temperature is displayed. On systems with iGPU + dGPU, choose the correct one.',
    gpu_auto_hint: 'Dedicated GPU if available, iGPU otherwise',
    gpu_none: 'No GPU detected via hwmon.',
    gpu_dedicated: 'Dedicated',
    gpu_igpu: 'iGPU',
    aio_title: 'Watercooling AIO',
    aio_desc: 'Only the NZXT Kraken Elite V2 is tested. Other models are pending hardware support.',
    device_supported: 'Supported',
    device_draft: 'Draft',
    device_active: 'Active',
    device_select: 'Select',
    request_sent: '✓ Request sent',
    request_support: 'Request support',
    lcd_info: 'LCD resolution: 480 × 480 px · Interface: USB Direct · Firmware: Kraken Elite V2',

    // Preview
    preview_alt: 'preview',
    preview_hint: 'Drag handles to reposition',

    // Sidebar
    sidebar_collapse: 'Collapse menu',
    sidebar_expand: 'Expand menu',
    collapse: 'Collapse',

    // Donate
    donate_text: "This project is open source and developed for free. If you appreciate it and want to support its development, any contribution is welcome. 🙏",

    // Error
    unknown_error: 'Unknown error',
    error: 'Error',

    // Language
    language: 'Language',
  },

  fr: {
    close_title: 'Fermer la fenêtre ?',
    close_sub: "L'app peut continuer en arrière-plan et maintenir le contrôle RGB + LCD.",
    close_bg: 'Garder en arrière-plan',
    close_quit: 'Quitter complètement',

    tab_general: 'Général',
    tab_profiles: 'Profils',
    tab_support: 'Support',

    accent_color: "Couleur d'accent",
    temp_unit: 'Unité de température',
    compact_sidebar: 'Sidebar compacte',
    compact_sidebar_sub: 'Afficher uniquement les icônes',
    autostart: 'Lancer au démarrage',
    autostart_on: "L'app démarre automatiquement avec ta session",
    autostart_off: "L'app ne démarre pas automatiquement",

    support_github: 'Dépôt GitHub',
    support_github_sub: 'Code source, issues et contributions',
    support_bug: 'Signaler un bug',
    support_bug_sub: 'Ouvrir une issue GitHub',
    support_reddit: 'Reddit r/NZXT',
    support_reddit_sub: 'Communauté NZXT',
    support_donate_title: 'Soutenir le projet',
    support_donate_sub: 'Gratuit et open-source. Partage-le ou fais un don crypto.',
    copy: 'Copier',
    copied: 'Copié',

    not_connected: 'Non connecté',
    not_detected: 'Non détecté',

    lcd_apply: 'Appliquer sur le LCD',
    lcd_applied: 'Appliqué sur le LCD',
    lcd_sending: 'Envoi…',
    lcd_not_available: 'LCD non disponible — vérifie la connexion du device',
    device_not_connected: 'Device non connecté',
    device_not_controllable: 'Device non contrôlable',

    loading_editor: "Chargement de l'éditeur…",
    templates: 'Modèles',
    elements: 'Éléments',
    properties: 'Propriétés',
    no_elements: 'Aucun élément',
    apply_error: '✕ Erreur — réessayer',
    select_element: "Sélectionne un élément (poignée sur l'aperçu ou liste à gauche) pour l'éditer.",

    metric: 'Métrique',
    start_angle: 'Angle départ',
    color: 'Couleur',
    alert_color: 'Couleur alerte',
    track_color: 'Couleur fond',
    align_center: 'Centré',

    speed_slowest: 'Très lent',
    speed_slower: 'Lent',
    speed_normal: 'Normal',
    speed_faster: 'Rapide',
    speed_fastest: 'Max',
    ch_fans: 'Ventilateurs',
    ch_all: 'Tout',
    ch_all_hint: 'Tous les canaux',
    ch_fans_hint: 'Fans / accessoires',
    color_label: 'Couleur',
    colors_label: 'Couleurs',
    apply: 'Appliquer',
    applied: 'Appliqué',

    fx_off: 'Éteint',
    fx_off_desc: 'LED éteintes',
    fx_fixed: 'Fixe',
    fx_fixed_desc: 'Couleur statique',
    fx_fading: 'Dégradé',
    fx_fading_desc: 'Transition multi-couleurs',
    fx_rainbow_pulse_desc: 'Arc-en-ciel pulsé',
    fx_marquee_desc: 'Couleur tournante',
    ring_tip: "Essayez ⭕ Ring AIO pour le ring blanc autour de l'écran LCD",

    preset_balanced: 'Équilibré',
    preset_readonly: '(lecture seule — profil prédéfini)',
    gpu_control_sub: 'Contrôle via hwmon · source temp GPU',
    cpu_control_sub: 'Contrôle via hwmon · source temp CPU',
    udev_missing: 'Règle udev manquante — relance',
    udev_reboot: 'avec sudo puis redémarre',
    case_fans: 'Ventilateurs Boîtier',
    channels_detected_one: 'canal détecté',
    channels_detected_many: 'canaux détectés',
    no_fans: 'Aucun ventilateur détecté via hwmon',
    watercooling_sub: 'Watercooling · contrôle CPU & liquide',
    edit_curve_hint: 'Passer en mode Manuel pour éditer la courbe',
    gpu_fans_title: 'GPU — Ventilateurs indépendants',
    gpu_fans_sub: 'Le GPU possède ses propres ventilateurs gérés directement par le pilote graphique. Ils ne font pas partie du circuit watercooling Kraken et ne peuvent pas être contrôlés ici.',
    manual_mode: 'Manuel',

    mode_temperatures: 'Températures',

    click_file: 'Cliquer pour choisir un fichier',
    uploading: 'Envoi en cours…',
    start_temp: 'Démarrer le mode Températures',
    starting: 'Démarrage…',

    saved_profiles: 'Profils sauvegardés',
    no_profiles: 'Crée un profil pour sauvegarder ta configuration',
    saved_msg: 'sauvegardé',
    applied_msg: 'appliqué',
    deleted_msg: 'supprimé',
    profile_mode_temp: 'Températures',
    profile_mode_none: 'LCD inchangé',
    profile_autostart_hint: 'Copie dans',
    profile_autostart_for: 'pour lancer un profil au démarrage',

    approx_data: '* Données approximatives',
    cpu_temp_sub: 'Température processeur',
    gpu_temp_sub: 'Température carte graphique',
    liquid_temp_sub: 'Température liquide de refroidissement',

    polling_title: 'Cadence & précision',
    polling_desc: 'Contrôle la fréquence de lecture des capteurs et de rafraîchissement du LCD.',
    lcd_render_label: 'Re-rendu LCD (ms)',
    lcd_render_help: "Fréquence de rendu de la scène. Le push USB ne se fait que si l'image change.",
    lcd_cooldown_label: 'Cooldown push LCD (ms)',
    lcd_cooldown_help: 'Délai minimum entre 2 envois USB. 0 = aucun.',
    decimals_label: 'Décimales affichées',
    gpu_source_title: 'Source GPU',
    gpu_source_desc: 'Sélectionne le GPU dont la température est affichée. Sur les systèmes avec iGPU + dGPU, choisis le bon.',
    gpu_auto_hint: 'Carte dédiée si disponible, iGPU sinon',
    gpu_none: 'Aucun GPU détecté via hwmon.',
    gpu_dedicated: 'Dédié',
    gpu_igpu: 'iGPU',
    aio_title: 'Watercooling AIO',
    aio_desc: "Seul le NZXT Kraken Elite V2 est testé. Les autres modèles sont en attente de support matériel.",
    device_supported: 'Supporté',
    device_draft: 'Brouillon',
    device_active: 'Actif',
    device_select: 'Sélectionner',
    request_sent: '✓ Demande envoyée',
    request_support: "Demander l'accès",
    lcd_info: 'Résolution LCD : 480 × 480 px · Interface : USB Direct · Firmware : Kraken Elite V2',

    preview_alt: 'aperçu',
    preview_hint: 'Glisse les poignées pour repositionner',

    sidebar_collapse: 'Réduire le menu',
    sidebar_expand: 'Ouvrir le menu',
    collapse: 'Réduire',

    donate_text: "Ce projet est open source et développé bénévolement. Si vous l'appréciez et souhaitez soutenir son développement, toute contribution est la bienvenue. 🙏",

    unknown_error: 'Erreur inconnue',
    error: 'Erreur',

    language: 'Langue',
  },
} as const

export type TranslationKey = keyof typeof translations['en']
