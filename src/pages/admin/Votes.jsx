import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { phaseCampagne, formatDate } from '../../lib/campagnes'
import { classerParVotes, designerLaureats, versPublication, NB_LAUREATS } from '../../lib/statistiques'
import { miniature } from '../../lib/cloudinary'

function Classement({ titre, medias, votes, likes, publiesIds, onOuvrir }) {
  const { retenus, exAequoExclus } = designerLaureats(medias, votes, likes)
  const idsRetenus = new Set(retenus.map(m => m.id))
  const tous = classerParVotes(medias, votes, likes)

  return (
    <div className="tb-carte-admin">
      <div className="tb-carte-admin__entete">
        <h2 className="tb-h3">{titre}</h2>
        <span className="tb-muted">{medias.length} en compétition</span>
      </div>

      {exAequoExclus.length > 0 && (
        <div className="tb-alerte">
          <strong>Égalité à la {NB_LAUREATS}e place :</strong>{' '}
          {exAequoExclus.map(m => m.titre).join(', ')} {exAequoExclus.length > 1 ? 'ont' : 'a'} autant de votes que le dernier lauréat,
          mais {exAequoExclus.length > 1 ? 'sont départagés' : 'est départagé'} par les likes. À vous de décider si vous gardez ce départage.
        </div>
      )}

      {tous.length === 0 ? (
        <p className="tb-muted">Aucun souvenir publié dans cette catégorie.</p>
      ) : (
        <ol className="tb-classement-admin">
          {tous.map((m, i) => (
            <li key={m.id} className={`${idsRetenus.has(m.id) ? 'is-laureat' : ''} ${i === NB_LAUREATS - 1 ? 'is-limite' : ''}`}>
              <span className="tb-classement-admin__pos">{i + 1}</span>
              <button type="button" className="tb-classement-admin__vignette" onClick={() => onOuvrir(m)} aria-label={`Voir « ${m.titre} »`}>
                <img src={miniature(m.fichier_url, 160)} alt="" loading="lazy" />
              </button>
              <span className="tb-classement-admin__texte">
                <strong>{m.titre}</strong>
                <span className="tb-muted">{m.prenom_nom} · {m.pays}</span>
              </span>
              <span className="tb-classement-admin__chiffres">
                <strong>{votes[m.id] || 0}</strong> vote{(votes[m.id] || 0) > 1 ? 's' : ''}
                <span className="tb-muted"> · {likes[m.id] || 0} j’aime</span>
              </span>
              {idsRetenus.has(m.id) && (
                <span className={`tb-statut ${publiesIds.has(m.id) ? 'tb-statut--publie' : ''}`}>
                  {publiesIds.has(m.id) ? 'Lauréat·e publié·e' : 'Lauréat·e'}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// Onglet « Votes & lauréats » : suivi des votes en direct et publication des lauréats
export default function Votes({ campagne, publies, likes, votes, nbVotants, onPublie, onOuvrir }) {
  const [occupe, setOccupe] = useState(false)
  const phase = phaseCampagne(campagne)
  const photos = publies.filter(m => m.type === 'Photo')
  const videos = publies.filter(m => m.type === 'Vidéo')
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0)
  const publiesIds = new Set([
    ...(campagne.resultats?.photo || []).map(r => r.mediaId),
    ...(campagne.resultats?.video || []).map(r => r.mediaId),
  ])

  async function publier() {
    if (phase.votesOuverts && !window.confirm('Les votes sont encore ouverts. Publier quand même les lauréats actuels ?')) return
    const tri = (liste) => liste.map(versPublication).sort((a, b) => a.prenom_nom.localeCompare(b.prenom_nom, 'fr'))
    setOccupe(true)
    try {
      await updateDoc(doc(db, 'campagnes', campagne.id), {
        resultats: {
          photo: tri(designerLaureats(photos, votes, likes).retenus),
          video: tri(designerLaureats(videos, votes, likes).retenus),
        },
        nbVotants,
        resultatsPublies: true,
        resultatsCalculesLe: serverTimestamp(),
      })
      onPublie()
    } catch (e) {
      window.alert('Publication impossible : ' + e.message)
    } finally {
      setOccupe(false)
    }
  }

  async function depublier() {
    if (!window.confirm('Retirer les lauréats du site ?')) return
    await updateDoc(doc(db, 'campagnes', campagne.id), { resultatsPublies: false })
    onPublie()
  }

  return (
    <section className="tb-admin-section">
      <div className="tb-encart tb-encart--info">
        <p>
          {campagne.debutVotes
            ? <>Votes du <strong>{formatDate(campagne.debutVotes)}</strong> au <strong>{formatDate(campagne.finVotes)}</strong> — {phase.votesOuverts ? 'en cours' : 'fermés'}.</>
            : <>Les dates de vote ne sont pas encore fixées : rends-toi dans l’onglet « Campagnes ».</>}
          {' '}<strong>{nbVotants}</strong> votant(s), <strong>{totalVotes}</strong> vote(s) valide(s).
          Les chiffres ci-dessous ne sont visibles que par l’équipe RI.
        </p>
        <div className="tb-actions">
          <button type="button" className="tb-btn tb-btn--corail" onClick={publier} disabled={occupe || totalVotes === 0}>
            {campagne.resultatsPublies ? 'Mettre à jour les lauréats publiés' : 'Publier les lauréats'}
          </button>
          {campagne.resultatsPublies && (
            <button type="button" className="tb-btn tb-btn--danger" onClick={depublier}>Retirer les lauréats du site</button>
          )}
        </div>
      </div>

      <div className="tb-grille-2">
        <Classement titre="Photos" medias={photos} votes={votes} likes={likes} publiesIds={publiesIds} onOuvrir={onOuvrir} />
        <Classement titre="Vidéos" medias={videos} votes={votes} likes={likes} publiesIds={publiesIds} onOuvrir={onOuvrir} />
      </div>
    </section>
  )
}
