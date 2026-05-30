/**
 * Catalogue des AIO watercooling à écran supportés / prévus.
 *
 * - `supported` : protocole implémenté et testé sur du vrai matériel.
 * - `draft`     : référencé mais non implémenté/testé — l'utilisateur peut
 *                 « demander l'accès » pour qu'il soit priorisé.
 */

export type DeviceStatus = 'supported' | 'draft'

export interface AioDevice {
  id: string
  brand: string
  name: string
  vid: number
  pid: number | null
  lcd: string
  status: DeviceStatus
  note?: string
}

export const AIO_DEVICES: AioDevice[] = [
  {
    id: 'nzxt-kraken-elite-v2',
    brand: 'NZXT',
    name: 'Kraken Elite V2 (2024)',
    vid: 0x1e71,
    pid: 0x3012,
    lcd: '640×640',
    status: 'supported',
    note: 'Tested — GIF, image, color and Temperatures mode working.'
  },
  {
    id: 'nzxt-kraken-2024-plus',
    brand: 'NZXT',
    name: 'Kraken 2024 Plus',
    vid: 0x1e71,
    pid: 0x3014,
    lcd: '240×240',
    status: 'draft'
  },
  {
    id: 'nzxt-kraken-2023-elite',
    brand: 'NZXT',
    name: 'Kraken 2023 Elite',
    vid: 0x1e71,
    pid: 0x300c,
    lcd: '640×640',
    status: 'draft'
  },
  {
    id: 'nzxt-kraken-2023',
    brand: 'NZXT',
    name: 'Kraken 2023',
    vid: 0x1e71,
    pid: 0x300e,
    lcd: '240×240',
    status: 'draft'
  },
  {
    id: 'nzxt-kraken-z',
    brand: 'NZXT',
    name: 'Kraken Z53 / Z63 / Z73',
    vid: 0x1e71,
    pid: 0x3008,
    lcd: '320×320',
    status: 'draft'
  },
  {
    id: 'corsair-icue-link-lcd',
    brand: 'Corsair',
    name: 'iCUE LINK Titan LCD',
    vid: 0x1b1c,
    pid: null,
    lcd: '480×480',
    status: 'draft'
  },
  {
    id: 'corsair-elite-lcd',
    brand: 'Corsair',
    name: 'iCUE Elite LCD',
    vid: 0x1b1c,
    pid: null,
    lcd: '480×480',
    status: 'draft'
  },
  {
    id: 'asus-ryujin-iii',
    brand: 'ASUS',
    name: 'ROG Ryujin III',
    vid: 0x0b05,
    pid: null,
    lcd: '320×320',
    status: 'draft'
  },
  {
    id: 'lianli-galahad-ii-lcd',
    brand: 'Lian Li',
    name: 'Galahad II LCD',
    vid: null as unknown as number,
    pid: null,
    lcd: '—',
    status: 'draft'
  }
]
