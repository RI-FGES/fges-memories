import { useEffect, useState } from 'react'
import { IconeAvion } from './Icones'
import { versDate, phaseCampagne, FUSEAU } from '../lib/campagnes'

function decompte(cible, now) {
  const diff = cible - now
  if (diff <= 0) return null
  const j = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${j} j ${String(h).padStart(2, '0')} h ${String(m).padStart(2, '0')} min`
}

function court(d) {
  return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: FUSEAU }).toUpperCase().replace('.', '') : '—'
}

// Le compte à rebours, façon carte d'embarquement
export default function CarteEmbarquement({ campagne }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const phase = phaseCampagne(campagne, now)
  let libelle = 'Embarquement terminé'
  let cible = null
  let porte = 'Fermée'
  let cloture = null

  if (phase.avantDepots) {
    libelle = 'Ouverture de l’embarquement dans'
    cible = versDate(campagne.debutDepots)
    porte = 'Bientôt'
    cloture = versDate(campagne.finDepots)
  } else if (phase.depotsOuverts) {
    libelle = 'Fin de l’embarquement dans'
    cible = versDate(campagne.finDepots)
    porte = 'Dépôts'
    cloture = cible
  } else if (phase.votesOuverts) {
    libelle = 'Fin des votes dans'
    cible = versDate(campagne.finVotes)
    porte = 'Votes'
    cloture = cible
  } else if (phase.resultatsPublies) {
    libelle = 'Les lauréats sont connus'
    porte = 'Lauréats'
  }

  const temps = cible ? decompte(cible, now) : null

  return (
    <div className="tb-embarquement">
      <div className="tb-embarquement__principal">
        <div className="tb-embarquement__ligne tb-petit-label">
          <span>Carte d’embarquement</span>
          <span>Vol FGES-{campagne?.nom?.replace(/\s+/g, '-') || '—'}</span>
        </div>
        <div className="tb-embarquement__trajet">
          <div>
            <p className="tb-embarquement__code">LIL</p>
            <p className="tb-embarquement__ville">Lille</p>
          </div>
          <div className="tb-embarquement__vol" aria-hidden="true">
            <span /><IconeAvion taille={22} /><span />
          </div>
          <div className="tb-align-droite">
            <p className="tb-embarquement__code">WLD</p>
            <p className="tb-embarquement__ville">Le monde</p>
          </div>
        </div>
        <div className="tb-embarquement__decompte">
          <span className="tb-petit-label">{libelle}</span>
          {temps && <strong>{temps}</strong>}
        </div>
      </div>
      <div className="tb-embarquement__talon">
        <div>
          <p className="tb-petit-label">Porte</p>
          <p className="tb-embarquement__valeur">{porte}</p>
        </div>
        <div>
          <p className="tb-petit-label">Clôture</p>
          <p className="tb-embarquement__valeur">{court(cloture)}</p>
        </div>
        <div className="tb-code-barres" aria-hidden="true" />
      </div>
    </div>
  )
}
