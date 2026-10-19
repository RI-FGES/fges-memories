import { Link } from 'react-router-dom'
import { useCampagnes, phaseCampagne, formatDate, formatFin } from '../lib/campagnes'
import { IconeCoeur, IconeEnvoi, IconeEtoile, IconeAvion } from '../components/Icones'
import Texte from '../components/Texte'
import Charte from '../components/Charte'
import { useTextes } from '../lib/textes'

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

function Escale({ numero, icone, titre, children, statut }) {
  return (
    <li className="tb-escale">
      <div className="tb-escale__tampon" aria-hidden="true">
        <span>Escale</span>
        <strong>{numero}</strong>
      </div>
      <div className="tb-escale__contenu">
        <div className="tb-escale__titre">
          <span className="tb-escale__icone" aria-hidden="true">{icone}</span>
          <h2 className="tb-h3">{titre}</h2>
          {statut && <span className="tb-statut tb-statut--publie">{statut}</span>}
        </div>
        {children}
      </div>
    </li>
  )
}

export default function CommentCaMarche() {
  const { active: c } = useCampagnes()
  const { textes } = useTextes()
  const phase = phaseCampagne(c)
  const maxPhotos = c?.maxPhotos || 1
  const maxVideos = c?.maxVideos || 1
  const votesPhoto = c?.nbVotesPhoto || 1
  const votesVideo = c?.nbVotesVideo || 1

  // Valeurs calculées à partir des réglages de la campagne, insérées dans les textes
  const periodeVotes = c?.debutVotes
    ? <>Du <strong>{formatDate(c.debutVotes)}</strong> au <strong>{formatFin(c.finVotes)}</strong></>
    : 'Pendant la période de vote (dates bientôt annoncées)'

  return (
    <div className="tb-page tb-page--etroite tb-regles">
      <div className="tb-centre">
        <p className="tb-surtitre">Le règlement du carnet</p>
        <Texte as="h1" className="tb-h1" valeur={textes.ccm_titre} />
        <Texte className="tb-texte" valeur={textes.ccm_intro} valeurs={{ campagne: c?.nom || 'à venir' }} />
      </div>

      <ol className="tb-itineraire">
        <Escale numero="1" icone={<IconeEnvoi taille={22} />} titre={textes.escale1_titre} statut={phase.depotsOuverts ? 'En cours' : null}>
          {c ? (
            <Texte className="tb-texte" valeur={textes.escale1_texte} valeurs={{
              debut: formatDate(c.debutDepots),
              fin: formatFin(c.finDepots),
              photos: pluriel(maxPhotos, 'photo'),
              videos: pluriel(maxVideos, 'vidéo'),
            }} />
          ) : (
            <Texte className="tb-texte" valeur={textes.escale1_sans_dates} />
          )}
          <Texte className="tb-texte" valeur={textes.escale1_complement} />
        </Escale>

        <Escale numero="2" icone={<IconeCoeur taille={22} />} titre={textes.escale2_titre}>
          <Texte className="tb-texte" valeur={textes.escale2_texte} />
        </Escale>

        <Escale numero="3" icone={<IconeEtoile taille={22} />} titre={textes.escale3_titre} statut={phase.votesOuverts ? 'En cours' : null}>
          <Texte className="tb-texte" valeur={textes.escale3_texte} valeurs={{
            periode: periodeVotes,
            votes_photo: pluriel(votesPhoto, 'vote'),
            votes_video: pluriel(votesVideo, 'vote'),
          }} />
        </Escale>

        <Escale numero="4" icone={<IconeAvion taille={22} />} titre={textes.escale4_titre} statut={phase.resultatsPublies ? 'Publiés' : null}>
          <Texte className="tb-texte" valeur={textes.escale4_texte} />
        </Escale>
      </ol>

      <Charte />

      <section className="tb-faq" aria-labelledby="titre-faq">
        <h2 id="titre-faq" className="tb-h2">Questions fréquentes</h2>
        {textes.faq.filter(x => x.q?.trim()).map((x, i) => (
          <details key={i} className="tb-faq__item">
            <summary>{x.q}</summary>
            <Texte className="tb-texte" valeur={x.r} />
          </details>
        ))}
      </section>

      <div className="tb-actions tb-actions--centre">
        {phase.depotsOuverts && <Link to="/deposer" className="tb-btn tb-btn--corail tb-btn--large">Déposer mon souvenir</Link>}
        <Link to="/galerie" className="tb-btn tb-btn--contour tb-btn--large">Explorer la galerie</Link>
      </div>
    </div>
  )
}
