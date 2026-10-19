// Icônes SVG au trait (héritent de la couleur du texte via currentColor)
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function IconeAvion({ taille = 20 }) {
  return (
    <svg width={taille} height={taille} {...base}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  )
}

export function IconeCoeur({ taille = 18, plein = false }) {
  return (
    <svg width={taille} height={taille} {...base} fill={plein ? 'currentColor' : 'none'} strokeWidth={1.8}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

export function IconeEtoile({ taille = 16, plein = false }) {
  return (
    <svg width={taille} height={taille} {...base} fill={plein ? 'currentColor' : 'none'}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function IconeLecture({ taille = 20 }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="7 4 20 12 7 20 7 4" />
    </svg>
  )
}

export function IconeEpingle({ taille = 16 }) {
  return (
    <svg width={taille} height={taille} {...base}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function IconeFermer({ taille = 20 }) {
  return (
    <svg width={taille} height={taille} {...base} strokeWidth={2.2}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function IconeEnvoi({ taille = 28 }) {
  return (
    <svg width={taille} height={taille} {...base} strokeWidth={1.6}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m17 8-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  )
}
