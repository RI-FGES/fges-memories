import { Children, useLayoutEffect, useRef, useState } from 'react'

// Mur de polaroïds façon Pinterest.
// Les cartes sont réparties dans des colonnes construites ici (et non avec les colonnes CSS,
// qui faisaient sauter les photos d'une colonne à l'autre pendant leur chargement).
// Ordre de lecture : de gauche à droite, puis ligne suivante.

function nbColonnes(largeur) {
  const mobile = largeur < 560
  const min = mobile ? 150 : 250  // largeur minimale d'une carte
  const espace = mobile ? 16 : 28 // espace entre colonnes
  return Math.max(1, Math.floor((largeur + espace) / (min + espace)))
}

export default function Mur({ children, className = '' }) {
  const ref = useRef(null)
  const [colonnes, setColonnes] = useState(() =>
    nbColonnes(Math.min(typeof window !== 'undefined' ? window.innerWidth - 64 : 1200, 1200)))

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const mesurer = () => {
      const n = nbColonnes(el.clientWidth)
      setColonnes(prev => (prev === n ? prev : n))
    }
    mesurer()
    const obs = new ResizeObserver(mesurer)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const cartes = Children.toArray(children)
  const repartition = Array.from({ length: colonnes }, () => [])
  cartes.forEach((carte, i) => repartition[i % colonnes].push(carte))

  return (
    <div ref={ref} className={`tb-mur ${className}`}>
      {repartition.map((liste, i) => (
        <div key={i} className="tb-mur__colonne">{liste}</div>
      ))}
    </div>
  )
}
