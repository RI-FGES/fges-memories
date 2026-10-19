import { Link } from 'react-router-dom'
import { useCampagnes, phaseCampagne, formatDate, formatFin } from '../lib/campagnes'
import { IconeCoeur, IconeEnvoi, IconeEtoile, IconeAvion } from '../components/Icones'

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

const QUESTIONS = [
  {
    q: 'Qui peut participer ?',
    r: 'Les étudiants de la FGES partis en échange. La plateforme leur est réservée : seuls les étudiants inscrits par le service des Relations Internationales peuvent se connecter, déposer, liker et voter. Si tu es parti·e en échange et que tu n’arrives pas à te connecter, écris au service RI.',
  },
  {
    q: 'Pourquoi mon souvenir n’apparaît pas encore dans la galerie ?',
    r: 'Chaque dépôt est vérifié par le service des Relations Internationales avant publication. Tu peux suivre son statut dans « Mon carnet ».',
  },
  {
    q: 'Je me suis trompé·e dans mon dépôt, je fais comment ?',
    r: 'Tant qu’il n’est pas validé, tu peux corriger sa légende depuis « Mon carnet », ou le retirer et en déposer un nouveau. Une fois publié, écris au service RI.',
  },
  {
    q: 'Je suis à l’autre bout du monde : à quelle heure ferment les dépôts et les votes ?',
    r: 'Toutes les dates sont à l’heure de Paris : tout ferme à 23h59, heure française. Selon ton pays, ça peut tomber le matin du lendemain ou dans l’après-midi. Le compte à rebours de la page d’accueil, lui, est toujours juste, où que tu sois.',
  },
  {
    q: 'Est-ce que je peux changer mon vote ?',
    r: 'Oui, tant que la période de vote est ouverte : retire ton vote sur un souvenir, puis donne-le à un autre.',
  },
  {
    q: 'Qui voit mes photos et vidéos ?',
    r: 'Seules les personnes connectées avec un compte de l’université. Les souvenirs des lauréats pourront aussi être utilisés par la FGES pour sa communication, comme indiqué au moment du dépôt.',
  },
]

export default function CommentCaMarche() {
  const { active: c } = useCampagnes()
  const phase = phaseCampagne(c)
  const maxPhotos = c?.maxPhotos || 1
  const maxVideos = c?.maxVideos || 1
  const votesPhoto = c?.nbVotesPhoto || 1
  const votesVideo = c?.nbVotesVideo || 1

  return (
    <div className="tb-page tb-page--etroite tb-regles">
      <div className="tb-centre">
        <p className="tb-surtitre">Le règlement du carnet</p>
        <h1 className="tb-h1">Comment ça marche ?</h1>
        <p className="tb-texte">
          Chaque semestre, le carnet s’ouvre pour une nouvelle campagne{c ? ` (en ce moment : ${c.nom})` : ''}.
          Voici l’itinéraire, en quatre escales.
        </p>
      </div>

      <ol className="tb-itineraire">
        <Escale numero="1" icone={<IconeEnvoi taille={22} />} titre="Dépose ton souvenir" statut={phase.depotsOuverts ? 'En cours' : null}>
          <p className="tb-texte">
            {c
              ? <>Du <strong>{formatDate(c.debutDepots)}</strong> au <strong>{formatFin(c.finDepots)}</strong>, colle dans le carnet jusqu’à <strong>{pluriel(maxPhotos, 'photo')}</strong> et <strong>{pluriel(maxVideos, 'vidéo')}</strong> (60 secondes maximum) de ton échange.</>
              : 'Les dates de la prochaine campagne seront bientôt annoncées.'}
          </p>
          <p className="tb-texte">Ajoute une légende et, si tu veux, quelques mots pour raconter ton souvenir. Le service RI le valide avant qu’il apparaisse dans la galerie.</p>
        </Escale>

        <Escale numero="2" icone={<IconeCoeur taille={22} />} titre="Like tes coups de cœur">
          <p className="tb-texte">
            Parcours la galerie et like autant de souvenirs que tu veux (un like par souvenir).
            Les likes ne désignent pas les lauréats : ils servent seulement à départager une égalité de votes.
          </p>
        </Escale>

        <Escale numero="3" icone={<IconeEtoile taille={22} />} titre="Vote pour tes préférés" statut={phase.votesOuverts ? 'En cours' : null}>
          <p className="tb-texte">
            {c?.debutVotes
              ? <>Du <strong>{formatDate(c.debutVotes)}</strong> au <strong>{formatFin(c.finVotes)}</strong>, </>
              : 'Pendant la période de vote (dates bientôt annoncées), '}
            tu disposes de <strong>{pluriel(votesPhoto, 'vote')} photo</strong> et de <strong>{pluriel(votesVideo, 'vote')} vidéo</strong>.
            Tu ne peux pas voter pour ton propre souvenir, et tu peux changer d’avis tant que les votes sont ouverts.
          </p>
        </Escale>

        <Escale numero="4" icone={<IconeAvion taille={22} />} titre="Les lauréats" statut={phase.resultatsPublies ? 'Publiés' : null}>
          <p className="tb-texte">
            Les <strong>5 photos</strong> et les <strong>5 vidéos</strong> qui reçoivent le plus de votes sont élues.
            Pas de classement entre elles : tous les lauréats sont à égalité.
          </p>
        </Escale>
      </ol>

      <section className="tb-charte" aria-labelledby="titre-charte">
        <h2 id="titre-charte" className="tb-charte__titre">La charte de bonne conduite</h2>
        <p>Les souvenirs représentent l’image de la FGES et de l’Université Catholique de Lille. Sera refusé tout contenu montrant :</p>
        <ul>
          <li>nudité ou tenue indécente ;</li>
          <li>consommation d’alcool, de cigarettes ou de substances ;</li>
          <li>propos ou gestes offensants, discriminatoires ou irrespectueux ;</li>
          <li>tout contenu contraire aux valeurs de l’établissement.</li>
        </ul>
        <p>
          <strong>Les personnes sur ta photo :</strong> si on reconnaît d’autres personnes sur ton souvenir,
          demande-leur leur accord avant de le déposer.
        </p>
        <p>
          <strong>La musique :</strong> évite les chansons connues dans tes vidéos. Si ta vidéo est lauréate,
          la FGES ne pourra pas la repartager sur ses réseaux à cause des droits d’auteur.
        </p>
      </section>

      <section className="tb-faq" aria-labelledby="titre-faq">
        <h2 id="titre-faq" className="tb-h2">Questions fréquentes</h2>
        {QUESTIONS.map(({ q, r }) => (
          <details key={q} className="tb-faq__item">
            <summary>{q}</summary>
            <p className="tb-texte">{r}</p>
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
