import { useState } from 'react'
import { Link } from 'react-router-dom'
import { setDoc } from 'firebase/firestore'
import { useTextes, TEXTES_DEFAUT, GROUPES_TEXTES, valeurTexte, refTextes } from '../../lib/textes'

const CLES = Object.keys(TEXTES_DEFAUT)
const pareil = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Nettoie une valeur avant enregistrement (lignes vides retirées des listes)
function nettoyer(cle, v) {
  if (cle === 'faq') return (v || []).map(x => ({ q: (x.q || '').trim(), r: (x.r || '').trim() })).filter(x => x.q)
  if (Array.isArray(v)) return v.map(x => x.trim()).filter(Boolean)
  return typeof v === 'string' ? v.trim() : v
}

// Ce qui est enregistré : seulement les textes différents de ceux d'origine
function aEnregistrer(brouillon) {
  const res = {}
  CLES.forEach(cle => {
    const v = nettoyer(cle, brouillon[cle])
    const vide = v === '' || (Array.isArray(v) && v.length === 0)
    if (!vide && !pareil(v, TEXTES_DEFAUT[cle])) res[cle] = v
  })
  return res
}

const lignes = (texte) => Math.min(8, Math.max(2, Math.ceil((texte || '').length / 75) + (texte || '').split('\n').length - 1))

function AideVariables({ variables }) {
  if (!variables) return null
  return (
    <p className="tb-note">
      Variables remplies automatiquement :{' '}
      {Object.entries(variables).map(([nom, sens], i) => (
        <span key={nom}>{i > 0 && ' · '}<code>{`{${nom}}`}</code> {sens}</span>
      ))}
    </p>
  )
}

function ChampListe({ valeur, onChange }) {
  const liste = valeur || []
  const maj = (i, v) => onChange(liste.map((x, j) => (j === i ? v : x)))
  const deplacer = (i, d) => {
    const copie = [...liste]
    const [x] = copie.splice(i, 1)
    copie.splice(i + d, 0, x)
    onChange(copie)
  }
  return (
    <div className="tb-textes-liste">
      {liste.map((point, i) => (
        <div key={i} className="tb-textes-liste__ligne">
          <input className="tb-input" value={point} onChange={e => maj(i, e.target.value)} aria-label={`Point ${i + 1}`} />
          <button type="button" className="tb-btn-icone" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
          <button type="button" className="tb-btn-icone" onClick={() => deplacer(i, 1)} disabled={i === liste.length - 1} aria-label="Descendre">↓</button>
          <button type="button" className="tb-btn-icone tb-btn-icone--danger" onClick={() => onChange(liste.filter((_, j) => j !== i))} aria-label="Supprimer">✕</button>
        </div>
      ))}
      <button type="button" className="tb-lien-discret" onClick={() => onChange([...liste, ''])}>+ Ajouter un point</button>
    </div>
  )
}

function ChampFaq({ valeur, onChange }) {
  const liste = valeur || []
  const maj = (i, champ, v) => onChange(liste.map((x, j) => (j === i ? { ...x, [champ]: v } : x)))
  const deplacer = (i, d) => {
    const copie = [...liste]
    const [x] = copie.splice(i, 1)
    copie.splice(i + d, 0, x)
    onChange(copie)
  }
  return (
    <div className="tb-textes-faq">
      {liste.map((x, i) => (
        <div key={i} className="tb-textes-faq__item">
          <div className="tb-actions tb-actions--entre">
            <span className="tb-label">Question {i + 1}</span>
            <div className="tb-actions">
              <button type="button" className="tb-btn-icone" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter">↑</button>
              <button type="button" className="tb-btn-icone" onClick={() => deplacer(i, 1)} disabled={i === liste.length - 1} aria-label="Descendre">↓</button>
              <button type="button" className="tb-btn-icone tb-btn-icone--danger" onClick={() => onChange(liste.filter((_, j) => j !== i))} aria-label="Supprimer la question">✕</button>
            </div>
          </div>
          <input className="tb-input" value={x.q} placeholder="La question" onChange={e => maj(i, 'q', e.target.value)} aria-label={`Question ${i + 1}`} />
          <textarea className="tb-input tb-textarea" rows={lignes(x.r)} value={x.r} placeholder="La réponse"
            onChange={e => maj(i, 'r', e.target.value)} aria-label={`Réponse ${i + 1}`} />
        </div>
      ))}
      <button type="button" className="tb-btn tb-btn--contour" onClick={() => onChange([...liste, { q: '', r: '' }])}>+ Ajouter une question</button>
    </div>
  )
}

function Champ({ champ, valeur, onChange }) {
  const { cle, label, type, variables } = champ
  const modifie = !pareil(nettoyer(cle, valeur), TEXTES_DEFAUT[cle]) && !(type === 'ligne' && !valeur)
  return (
    <div className="tb-champ tb-textes-champ">
      <div className="tb-actions tb-actions--entre">
        <label className="tb-label" htmlFor={`texte-${cle}`}>
          {label} {modifie && <span className="tb-statut tb-statut--attente">modifié</span>}
        </label>
        {modifie && (
          <button type="button" className="tb-lien-discret" onClick={() => onChange(TEXTES_DEFAUT[cle])}>Texte d’origine</button>
        )}
      </div>
      {type === 'liste' ? (
        <ChampListe valeur={valeur} onChange={onChange} />
      ) : type === 'faq' ? (
        <ChampFaq valeur={valeur} onChange={onChange} />
      ) : type === 'ligne' ? (
        <input id={`texte-${cle}`} className="tb-input" value={valeur} onChange={e => onChange(e.target.value)} />
      ) : (
        <textarea id={`texte-${cle}`} className="tb-input tb-textarea" rows={lignes(valeur)} value={valeur}
          placeholder={TEXTES_DEFAUT[cle]} onChange={e => onChange(e.target.value)} />
      )}
      <AideVariables variables={variables} />
    </div>
  )
}

function Editeur({ modifies, recharger, groupeId, setGroupeId }) {
  const [brouillon, setBrouillon] = useState(() => Object.fromEntries(CLES.map(c => [c, valeurTexte(modifies, c)])))
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState('')

  const groupe = GROUPES_TEXTES.find(g => g.id === groupeId)
  const nonEnregistre = !pareil(aEnregistrer(brouillon), modifies)

  const maj = (cle, v) => { setBrouillon(b => ({ ...b, [cle]: v })); setMessage('') }

  function origineGroupe() {
    if (!window.confirm(`Remettre tous les textes « ${groupe.titre} » comme à l’origine ? (pense à enregistrer ensuite)`)) return
    setBrouillon(b => ({ ...b, ...Object.fromEntries(groupe.champs.map(ch => [ch.cle, TEXTES_DEFAUT[ch.cle]])) }))
  }

  async function enregistrer() {
    setEnvoi(true)
    setMessage('')
    try {
      await setDoc(refTextes(), aEnregistrer(brouillon))
      await recharger()
    } catch (e) {
      setMessage(`Enregistrement impossible : ${e.message}`)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="tb-admin-section">
      <p className="tb-encart tb-encart--info"><span>
        Modifie ici les textes affichés aux étudiants. Mise en forme : <code>**mot**</code> pour mettre en gras,
        Entrée pour aller à la ligne. Les dates et les nombres restent calculés automatiquement à partir de la campagne.
        Un champ vidé reprend son texte d’origine.
      </span></p>

      <div className="tb-segment tb-textes-onglets" role="tablist" aria-label="Pages">
        {GROUPES_TEXTES.map(g => (
          <button key={g.id} type="button" role="tab" aria-selected={g.id === groupeId}
            className={`tb-segment__btn ${g.id === groupeId ? 'is-actif' : ''}`} onClick={() => setGroupeId(g.id)}>
            {g.titre}
          </button>
        ))}
      </div>

      <div className="tb-carte-admin tb-form">
        <div className="tb-actions tb-actions--entre">
          <h2 className="tb-h3">{groupe.titre}</h2>
          <div className="tb-actions">
            {groupe.lien && <Link to={groupe.lien} target="_blank" rel="noreferrer" className="tb-lien-discret">Voir la page ↗</Link>}
            <button type="button" className="tb-lien-discret" onClick={origineGroupe}>Tout remettre d’origine</button>
          </div>
        </div>
        {groupe.aide && <p className="tb-note">{groupe.aide}</p>}
        {groupe.champs.map(ch => (
          <Champ key={ch.cle} champ={ch} valeur={brouillon[ch.cle]} onChange={v => maj(ch.cle, v)} />
        ))}
      </div>

      <div className={`tb-textes-barre ${nonEnregistre ? 'is-modifie' : ''}`}>
        <span>{message || (nonEnregistre ? 'Modifications non enregistrées' : 'Tout est enregistré : les textes sont à jour sur le site.')}</span>
        <button type="button" className="tb-btn tb-btn--marine" onClick={enregistrer} disabled={envoi || !nonEnregistre}>
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </section>
  )
}

// Section « Textes du site » de l'Espace RI
export default function Textes() {
  const { modifies, recharger } = useTextes()
  const [groupeId, setGroupeId] = useState(GROUPES_TEXTES[0].id)
  // L'éditeur repart des textes enregistrés à chaque rechargement (l'onglet ouvert est conservé)
  return <Editeur key={JSON.stringify(modifies)} modifies={modifies} recharger={recharger}
    groupeId={groupeId} setGroupeId={setGroupeId} />
}
