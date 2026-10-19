import { useTextes } from '../lib/textes'
import Texte from './Texte'

// La charte de bonne conduite (textes modifiables dans l'Espace RI > Textes du site)
// titreComme : 'h2' sur la page Comment ça marche, 'p' dans le formulaire de dépôt
export default function Charte({ titreComme = 'h2' }) {
  const { textes } = useTextes()
  return (
    <section className="tb-charte" aria-labelledby="titre-charte">
      <Texte as={titreComme} id="titre-charte" className="tb-charte__titre" valeur={textes.charte_titre} />
      <Texte valeur={textes.charte_intro} />
      <ul>
        {textes.charte_points.map((point, i) => <Texte as="li" key={i} valeur={point} />)}
      </ul>
      {textes.charte_personnes && <Texte valeur={textes.charte_personnes} />}
      {textes.charte_musique && <Texte valeur={textes.charte_musique} />}
    </section>
  )
}
