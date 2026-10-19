const COULEURS = ['#ff7a59', '#29b2be', '#e8c77a', '#002d6a']

// Pluie de confettis (purement décorative, désactivée si l'utilisateur réduit les animations)
export default function Confettis({ nombre = 36 }) {
  return (
    <div className="tb-confettis" aria-hidden="true">
      {Array.from({ length: nombre }, (_, i) => (
        <span
          key={i}
          style={{
            '--x': `${(i * 37) % 100}%`,
            '--delai': `${(i % 9) * 0.08}s`,
            '--couleur': COULEURS[i % COULEURS.length],
            '--rot': `${(i * 47) % 360}deg`,
          }}
        />
      ))}
    </div>
  )
}
