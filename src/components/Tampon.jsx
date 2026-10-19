import { continentDe, rotationStable } from '../lib/pays'

// Tampon de passeport coloré selon le continent du pays
export default function Tampon({ pays, graine, className = '' }) {
  if (!pays) return null
  const rotation = rotationStable(graine || pays, 9)
  return (
    <span
      className={`tb-tampon tb-tampon--${continentDe(pays)} ${className}`}
      style={{ '--rot': `${rotation}deg` }}
    >
      {pays}
    </span>
  )
}
