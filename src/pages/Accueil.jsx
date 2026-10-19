import { Link } from 'react-router-dom'
import { useCampagnes, phaseCampagne } from '../lib/campagnes'
import { useMediasCampagne } from '../lib/interactions'
import { continentDe, rotationStable } from '../lib/pays'
import { miniature } from '../lib/cloudinary'
import CarteEmbarquement from '../components/CarteEmbarquement'
import Tampon from '../components/Tampon'
import { IconeEpingle, IconeLecture } from '../components/Icones'

// Photos de secours tant que la campagne n'a pas encore de souvenirs (dossier /public)
const PHOTOS_PAR_DEFAUT = [
  { id: 'd1', fichier_url: '/photo1.jpg', titre: 'Ton souvenir ici ?' },
  { id: 'd2', fichier_url: '/photo2.jpeg', titre: 'Bientôt le tien' },
  { id: 'd3', fichier_url: '/photo3.jpg', titre: 'Carnet à remplir' },
  { id: 'd4', fichier_url: '/photo4.jpg', titre: 'Et toi, où es-tu ?' },
]
const POSITIONS = ['tb-collage__item--1', 'tb-collage__item--2', 'tb-collage__item--3', 'tb-collage__item--4']
const SCOTCHS = ['tb-scotch--turquoise', 'tb-scotch--corail', 'tb-scotch--or', 'tb-scotch--turquoise']

export default function Accueil() {
  const { active, chargement } = useCampagnes()
  const { medias } = useMediasCampagne(active?.id)
  const phase = phaseCampagne(active)

  const collage = medias.length >= 4 ? medias.slice(0, 4) : PHOTOS_PAR_DEFAUT
  const nbPays = new Set(medias.map(m => m.pays).filter(Boolean)).size
  const nbContinents = new Set(medias.map(m => m.pays).filter(Boolean).map(continentDe)).size

  return (
    <>
      <div className="tb-accueil">
        <section className="tb-accueil__texte">
          <p className="tb-surtitre">Service des Relations Internationales · FGES</p>
          <div className="tb-accueil__titre-bloc">
            <h1 className="tb-h1 tb-h1--xl">Le carnet de voyage des étudiants FGES</h1>
            {active && <p className="tb-manuscrit tb-annotation">édition {active.nom}</p>}
          </div>
          <p className="tb-texte tb-texte--grand">
            Tu es parti·e en échange ? Colle ton plus beau souvenir dans le carnet, like ceux des autres
            et vote pour élire les lauréats du semestre.
          </p>

          {chargement ? null : active ? (
            <CarteEmbarquement campagne={active} />
          ) : (
            <p className="tb-encart">Aucune campagne n’est ouverte pour le moment. Reviens bientôt !</p>
          )}

          <div className="tb-actions">
            {phase.depotsOuverts && (
              <Link to="/deposer" className="tb-btn tb-btn--corail tb-btn--large">Déposer mon souvenir</Link>
            )}
            <Link to="/galerie" className="tb-btn tb-btn--contour tb-btn--large">Explorer la galerie</Link>
            {phase.resultatsPublies && (
              <Link to="/top5" className="tb-btn tb-btn--contour tb-btn--large">Voir les lauréats</Link>
            )}
          </div>

          {medias.length > 0 && (
            <p className="tb-stats">
              <IconeEpingle />
              <span>
                <strong>{medias.length}</strong> souvenir{medias.length > 1 ? 's' : ''} ·{' '}
                <strong>{nbPays}</strong> pays · <strong>{nbContinents}</strong> continent{nbContinents > 1 ? 's' : ''}
              </span>
            </p>
          )}
          <Link to="/comment-ca-marche" className="tb-lien-discret">Comment ça marche ?</Link>
        </section>

        <section className="tb-collage" aria-label="Derniers souvenirs">
          {collage.map((m, i) => (
            <figure
              key={m.id}
              className={`tb-collage__item ${POSITIONS[i]}`}
              style={{ '--rot': `${rotationStable(m.id, 6)}deg` }}
            >
              <span className={`tb-scotch ${SCOTCHS[i]}`} aria-hidden="true" />
              <div className="tb-collage__photo">
                <img src={miniature(m.fichier_url, 500)} alt="" loading="lazy" />
                {m.type === 'Vidéo' && <span className="tb-polaroid__lecture"><IconeLecture /></span>}
              </div>
              <figcaption className="tb-manuscrit">{m.titre}</figcaption>
              {i === 0 && m.pays && <Tampon pays={m.pays} graine={m.id} className="tb-collage__tampon" />}
            </figure>
          ))}
        </section>
      </div>

    </>
  )
}
