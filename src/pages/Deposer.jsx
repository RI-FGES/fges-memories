import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth, nomDepuisEmail } from '../auth/contexte'
import { useCampagnes, phaseCampagne, formatDate, formatFin, heureLocale } from '../lib/campagnes'
import { uploaderFichier, typeDepuisFichier, TAILLE_MAX } from '../lib/cloudinary'
import { preparerPhoto, dureeVideo, TAILLE_MAX_ORIGINALE, DUREE_MAX_VIDEO } from '../lib/compression'
import { cleType } from '../lib/interactions'
import { PAYS, FILIERES, DUREES } from '../lib/pays'
import Polaroid from '../components/Polaroid'
import Confettis from '../components/Confettis'
import { IconeEnvoi } from '../components/Icones'

const MAX_LEGENDE = 60
const MAX_CAPTION = 150

const ETAPES = [
  { num: 1, label: 'Toi' },
  { num: 2, label: 'Ton voyage' },
  { num: 3, label: 'Ton souvenir' },
]

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

// Nombre de dépôts autorisés par type pour la campagne
function maxDepots(campagne, type) {
  const n = type === 'Vidéo' ? campagne?.maxVideos : campagne?.maxPhotos
  return Number.isInteger(n) && n > 0 ? n : 1
}

async function lireMesDepots(uid, campagneId) {
  const snap = await getDocs(query(collection(db, 'medias'), where('uid', '==', uid)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.campagneId === campagneId)
}

export default function Deposer() {
  const { user } = useAuth()
  const { active, chargement } = useCampagnes()
  const phase = phaseCampagne(active)

  const [mesDepots, setMesDepots] = useState(null) // null = en cours de chargement
  const [etape, setEtape] = useState(1)
  const [form, setForm] = useState(() => ({
    prenom_nom: nomDepuisEmail(user?.email),
    filiere: '', duree: '', pays: '', ville: '', universite: '', titre: '', caption: '',
  }))
  const [fichier, setFichier] = useState(null)
  const [apercuUrl, setApercuUrl] = useState('')
  const [survol, setSurvol] = useState(false)
  const [erreur, setErreur] = useState('')
  const [progression, setProgression] = useState(null)
  const [succes, setSucces] = useState(false)
  const [charte, setCharte] = useState(false)
  const [consentement, setConsentement] = useState(false)
  const [accordTiers, setAccordTiers] = useState(false)
  const [preparation, setPreparation] = useState(false) // photo en cours de réduction
  const [apercuIndispo, setApercuIndispo] = useState(false)
  const dernierChoix = useRef(0) // ignore un ancien fichier si l'étudiant en choisit un autre entre-temps

  const type = typeDepuisFichier(fichier)

  useEffect(() => {
    if (!active?.id || !user?.uid) return
    lireMesDepots(user.uid, active.id)
      .then(setMesDepots)
      .catch(e => { console.error(e); setMesDepots([]) })
  }, [active?.id, user?.uid])

  // Libère l'URL temporaire de l'aperçu
  useEffect(() => () => { if (apercuUrl) URL.revokeObjectURL(apercuUrl) }, [apercuUrl])

  // Places libres : chaque dépôt occupe un "emplacement" numéroté (photo_1, photo_2…)
  function emplacementsLibres(t) {
    // Un souvenir refusé libère sa place : l'étudiant peut en déposer un autre
    const pris = new Set((mesDepots || []).filter(m => m.type === t && m.statut !== 'refuse').map(m => m.slot))
    return Array.from({ length: maxDepots(active, t) }, (_, i) => i + 1).filter(n => !pris.has(n))
  }
  const restePhotos = emplacementsLibres('Photo').length
  const resteVideos = emplacementsLibres('Vidéo').length

  const maj = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setErreur('') }

  async function choisirFichier(f) {
    setErreur('')
    if (!f) return
    const t = typeDepuisFichier(f)
    if (!t) return setErreur('Formats acceptés : photo (JPG, PNG, HEIC…) ou vidéo (MP4, MOV…).')
    if (emplacementsLibres(t).length === 0) {
      return setErreur(t === 'Vidéo'
        ? `Tu as déjà déposé ${pluriel(maxDepots(active, t), 'vidéo')} pour cette campagne.`
        : `Tu as déjà déposé ${pluriel(maxDepots(active, t), 'photo')} pour cette campagne.`)
    }

    if (t === 'Vidéo') {
      const duree = await dureeVideo(f)
      if (duree && duree > DUREE_MAX_VIDEO + 0.5) {
        return setErreur(`Ta vidéo dure ${Math.round(duree)} secondes : ${DUREE_MAX_VIDEO} secondes maximum. Raccourcis-la depuis ton téléphone puis réessaie.`)
      }
    }

    let pret = f
    let apercuOk = true
    if (t === 'Photo') {
      if (f.size > TAILLE_MAX_ORIGINALE) return setErreur('Cette photo est vraiment trop lourde (40 Mo maximum).')
      const numero = ++dernierChoix.current
      setPreparation(true)
      try {
        const resultat = await preparerPhoto(f)
        if (numero !== dernierChoix.current) return
        pret = resultat.fichier
        apercuOk = resultat.apercuPossible
      } finally {
        if (numero === dernierChoix.current) setPreparation(false)
      }
    }

    if (pret.size > TAILLE_MAX[t]) {
      return setErreur(t === 'Vidéo'
        ? 'La vidéo est trop lourde (100 Mo maximum). Astuce : envoie-la-toi en qualité réduite ou raccourcis-la.'
        : 'La photo est trop lourde (10 Mo maximum) et ton navigateur n’a pas pu la réduire. Essaie de l’exporter en JPG.')
    }
    setFichier(pret)
    setApercuIndispo(!apercuOk)
    setApercuUrl(apercuOk ? URL.createObjectURL(pret) : '')
  }

  function etapeValide(n) {
    if (n === 1) return form.prenom_nom.trim() && form.filiere && form.duree
    if (n === 2) return form.pays && form.ville.trim() && form.universite.trim()
    return fichier && form.titre.trim() && charte && accordTiers && consentement
  }

  function suivant(e) {
    e.preventDefault()
    if (!etapeValide(etape)) return setErreur('Merci de remplir tous les champs de cette étape.')
    setErreur('')
    setEtape(etape + 1)
  }

  async function envoyer(e) {
    e.preventDefault()
    if (!etapeValide(3)) return setErreur('Il manque le fichier, la légende ou une case à cocher.')
    const slot = emplacementsLibres(type)[0]
    if (!slot) return setErreur('Tu as atteint le nombre maximum de dépôts pour ce type de média.')
    setErreur('')
    setProgression(0)
    try {
      const envoi = await uploaderFichier(fichier, setProgression)
      // Identifiant fixe par emplacement : impossible de dépasser la limite, même en trichant
      const id = `${active.id}_${user.uid}_${cleType(type)}_${slot}`
      const nouveau = {
        uid: user.uid,
        email: user.email,
        prenom_nom: form.prenom_nom.trim(),
        filiere: form.filiere,
        duree: form.duree,
        pays: form.pays,
        ville: form.ville.trim(),
        universite: form.universite.trim(),
        titre: form.titre.trim().slice(0, MAX_LEGENDE),
        caption: form.caption.trim().slice(0, MAX_CAPTION),
        type,
        slot,
        fichier_url: envoi.url,
        cloudinary_public_id: envoi.publicId,
        resource_type: envoi.resourceType,
        statut: 'en_attente',
        campagneId: active.id,
        created_at: new Date().toISOString(),
      }
      // Si cet emplacement contenait un souvenir refusé, on le retire d'abord
      if ((mesDepots || []).some(m => m.id === id)) await deleteDoc(doc(db, 'medias', id))
      await setDoc(doc(db, 'medias', id), nouveau)
      setMesDepots(prev => [...(prev || []).filter(m => m.id !== id), { id, ...nouveau }])
      setSucces(true)
    } catch (err) {
      console.error(err)
      setErreur(err?.code === 'permission-denied'
        ? 'Dépôt refusé : les dépôts sont fermés, ta limite est atteinte ou ton compte n’est pas autorisé.'
        : `Problème lors de l’envoi : ${err.message}`)
    } finally {
      setProgression(null)
    }
  }

  function recommencer() {
    setSucces(false); setEtape(3); setFichier(null); setApercuUrl(''); setApercuIndispo(false)
    setForm(f => ({ ...f, titre: '', caption: '' }))
    setCharte(false); setAccordTiers(false); setConsentement(false)
  }

  const apercu = {
    id: 'apercu', ...form, type,
    apercuUrl: type === 'Photo' ? apercuUrl : '',
    apercuVideo: type === 'Vidéo' ? apercuUrl : '',
    titre: form.titre || 'Ta légende ici', caption: form.caption,
  }

  if (chargement || (active && phase.depotsOuverts && mesDepots === null)) {
    return <div className="tb-page"><p className="tb-muted">Chargement…</p></div>
  }

  if (!active || !phase.depotsOuverts) {
    return (
      <div className="tb-page tb-page--etroite tb-centre">
        <p className="tb-surtitre tb-surtitre--corail">Porte d’embarquement</p>
        <h1 className="tb-h1">{phase.avantDepots ? 'L’embarquement n’a pas commencé' : 'Les dépôts sont fermés'}</h1>
        <p className="tb-texte">
          {phase.avantDepots
            ? `Les dépôts ouvriront le ${formatDate(active.debutDepots)}.`
            : 'Tu peux toujours explorer la galerie et voter pendant la phase de vote.'}
        </p>
        <Link to="/galerie" className="tb-btn tb-btn--marine">Explorer la galerie</Link>
      </div>
    )
  }

  if (succes) {
    return (
      <div className="tb-page tb-page--etroite tb-centre tb-succes">
        <Confettis />
        <div className="tb-succes__carte">
          <Polaroid media={apercu} apercu />
          <div className="tb-tampon-acces tb-tampon-acces--attente">En attente de validation</div>
        </div>
        <h1 className="tb-h1">Ton souvenir a bien décollé</h1>
        <p className="tb-texte">Le service RI va le valider très vite. Tu le retrouveras ensuite dans la galerie et dans ton carnet.</p>
        <div className="tb-actions tb-actions--centre">
          <Link to="/mon-carnet" className="tb-btn tb-btn--marine">Voir mon carnet</Link>
          {(restePhotos > 0 || resteVideos > 0) && (
            <button type="button" className="tb-btn tb-btn--contour" onClick={recommencer}>Déposer un autre souvenir</button>
          )}
        </div>
      </div>
    )
  }

  if (restePhotos === 0 && resteVideos === 0) {
    return (
      <div className="tb-page tb-page--etroite tb-centre">
        <p className="tb-surtitre tb-surtitre--corail">Carnet complet</p>
        <h1 className="tb-h1">Tu as déjà collé tous tes souvenirs</h1>
        <p className="tb-texte">
          Pour cette campagne, chaque étudiant peut déposer {pluriel(maxDepots(active, 'Photo'), 'photo')} et {pluriel(maxDepots(active, 'Vidéo'), 'vidéo')}.
          Tant qu’un dépôt n’est pas validé, tu peux le retirer depuis ton carnet pour le remplacer. Si un souvenir est refusé, sa place se libère automatiquement.
        </p>
        <div className="tb-actions tb-actions--centre">
          <Link to="/mon-carnet" className="tb-btn tb-btn--marine">Voir mon carnet</Link>
          <Link to="/galerie" className="tb-btn tb-btn--contour">Explorer la galerie</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="tb-page tb-depot">
      <div className="tb-depot__formulaire">
        <h1 className="tb-h1">Coller un souvenir</h1>
        <p className="tb-texte">
          Dépôts ouverts jusqu’au <strong>{formatFin(active.finDepots)}</strong>{heureLocale(active.finDepots) && <span className="tb-muted"> ({heureLocale(active.finDepots)})</span>}.
          Il te reste <strong>{pluriel(restePhotos, 'photo')}</strong> et <strong>{pluriel(resteVideos, 'vidéo')}</strong> à déposer.
        </p>

        <ol className="tb-etapes" aria-label="Étapes">
          {ETAPES.map(s => (
            <li key={s.num} className={`tb-etapes__item ${etape === s.num ? 'is-actif' : ''} ${etape > s.num ? 'is-fait' : ''}`}
              aria-current={etape === s.num ? 'step' : undefined}>
              <span className="tb-etapes__num">{s.num}</span>{s.label}
            </li>
          ))}
        </ol>

        <form onSubmit={etape < 3 ? suivant : envoyer} className="tb-form" noValidate>
          {etape === 1 && (
            <>
              <div className="tb-champ">
                <label className="tb-label" htmlFor="prenom_nom">Prénom et nom</label>
                <input id="prenom_nom" name="prenom_nom" className="tb-input" value={form.prenom_nom} onChange={maj} required />
              </div>
              <div className="tb-champ">
                <label className="tb-label" htmlFor="filiere">Filière</label>
                <select id="filiere" name="filiere" className="tb-input" value={form.filiere} onChange={maj} required>
                  <option value="">— Sélectionner —</option>
                  {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <fieldset className="tb-champ tb-choix">
                <legend className="tb-label">Durée de ton échange</legend>
                <div className="tb-choix__options">
                  {DUREES.map(d => (
                    <label key={d.valeur} className={`tb-choix__option ${form.duree === d.valeur ? 'is-actif' : ''}`}>
                      <input type="radio" name="duree" value={d.valeur} checked={form.duree === d.valeur} onChange={maj} />
                      {d.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {etape === 2 && (
            <>
              <div className="tb-champ">
                <label className="tb-label" htmlFor="pays">Pays</label>
                <select id="pays" name="pays" className="tb-input" value={form.pays} onChange={maj} required>
                  <option value="">— Sélectionner —</option>
                  {PAYS.map(p => <option key={p.nom} value={p.nom}>{p.nom}</option>)}
                </select>
              </div>
              <div className="tb-champ">
                <label className="tb-label" htmlFor="ville">Ville</label>
                <input id="ville" name="ville" className="tb-input" placeholder="Ex : Tokyo" value={form.ville} onChange={maj} required />
              </div>
              <div className="tb-champ">
                <label className="tb-label" htmlFor="universite">Université d’accueil</label>
                <input id="universite" name="universite" className="tb-input" placeholder="Ex : Meiji University" value={form.universite} onChange={maj} required />
              </div>
            </>
          )}

          {etape === 3 && (
            <>
              <label
                className={`tb-depot-zone ${survol ? 'is-survol' : ''} ${fichier ? 'is-rempli' : ''}`}
                onDragOver={e => { e.preventDefault(); setSurvol(true) }}
                onDragLeave={() => setSurvol(false)}
                onDrop={e => { e.preventDefault(); setSurvol(false); choisirFichier(e.dataTransfer.files[0]) }}
              >
                <input
                  type="file"
                  accept={[restePhotos > 0 && 'image/*,.heic,.heif', resteVideos > 0 && 'video/*'].filter(Boolean).join(',')}
                  className="tb-sr-only"
                  onChange={e => choisirFichier(e.target.files[0])}
                />
                <IconeEnvoi />
                {preparation ? (
                  <span><strong>Préparation de ta photo…</strong><br />on l’allège pour qu’elle s’envoie plus vite</span>
                ) : fichier ? (
                  <span>
                    <strong>{fichier.name}</strong> · {type} · {(fichier.size / 1024 / 1024).toFixed(1)} Mo<br />
                    {apercuIndispo && <>Aperçu indisponible pour ce format, mais ta photo sera bien envoyée.<br /></>}
                    Clique pour changer
                  </span>
                ) : (
                  <span>
                    <strong>
                      {restePhotos > 0 && resteVideos > 0 ? 'Glisse ta photo ou ta vidéo ici' : restePhotos > 0 ? 'Glisse ta photo ici' : 'Glisse ta vidéo ici'}
                    </strong>
                    <br />ou clique pour choisir un fichier (vidéo : 60 secondes et 100 Mo max · les photos sont allégées automatiquement)
                  </span>
                )}
              </label>

              <div className="tb-champ">
                <label className="tb-label" htmlFor="titre">Légende</label>
                <input id="titre" name="titre" className="tb-input" maxLength={MAX_LEGENDE}
                  placeholder="Ex : Coucher de soleil sur Shibuya" value={form.titre} onChange={maj} required />
              </div>
              <div className="tb-champ">
                <label className="tb-label" htmlFor="caption">Raconte ton souvenir <span className="tb-muted">(facultatif)</span></label>
                <textarea id="caption" name="caption" className="tb-input tb-textarea" rows={3} maxLength={MAX_CAPTION}
                  placeholder="Quelques mots, comme sous un post Insta…" value={form.caption} onChange={maj} />
                <p className={`tb-compteur ${form.caption.length >= MAX_CAPTION - 10 ? 'is-limite' : ''}`}>
                  {form.caption.length} / {MAX_CAPTION}
                </p>
              </div>

              <div className="tb-charte">
                <p className="tb-charte__titre">Charte de bonne conduite</p>
                <p>Les médias déposés représentent l’image de la FGES et de l’Université Catholique de Lille. Sera refusé tout contenu montrant :</p>
                <ul>
                  <li>nudité ou tenue indécente ;</li>
                  <li>consommation d’alcool, de cigarettes ou de substances ;</li>
                  <li>propos ou gestes offensants, discriminatoires ou irrespectueux ;</li>
                  <li>tout contenu contraire aux valeurs de l’établissement.</li>
                </ul>
                <p>
                  <strong>Bon à savoir pour les vidéos :</strong> évite les musiques connues (chansons du commerce).
                  Si ta vidéo est lauréate, la FGES ne pourra pas la partager sur ses réseaux à cause des droits d’auteur.
                  Préfère le son d’ambiance, ta voix ou une musique libre de droits.
                </p>
              </div>
              <label className="tb-case">
                <input type="checkbox" checked={charte} onChange={e => setCharte(e.target.checked)} />
                <span>J’ai lu la charte et je certifie que mon média la respecte.</span>
              </label>
              <label className="tb-case">
                <input type="checkbox" checked={accordTiers} onChange={e => setAccordTiers(e.target.checked)} />
                <span>
                  Les personnes reconnaissables sur mon média sont d’accord pour qu’il soit publié sur FGES Memories
                  et, s’il est lauréat, utilisé par la FGES.
                </span>
              </label>
              <label className="tb-case">
                <input type="checkbox" checked={consentement} onChange={e => setConsentement(e.target.checked)} />
                <span>
                  J’accepte que la FGES conserve ce média. S’il fait partie des lauréats, j’autorise la FGES à l’utiliser
                  pour sa communication (réseaux sociaux, site web, promotion de la mobilité internationale).{' '}
                  <Link to="/donnees-personnelles" target="_blank" rel="noreferrer">En savoir plus sur tes données</Link>
                </span>
              </label>
            </>
          )}

          {erreur && <p className="tb-erreur" role="alert">{erreur}</p>}

          {progression !== null && (
            <div className="tb-progression" role="progressbar" aria-valuenow={progression} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progression}%` }} />
              <p>Envoi en cours… {progression} %</p>
            </div>
          )}

          <div className="tb-actions">
            {etape > 1 && (
              <button type="button" className="tb-btn tb-btn--contour" onClick={() => { setErreur(''); setEtape(etape - 1) }} disabled={progression !== null}>
                Retour
              </button>
            )}
            <button type="submit" className={`tb-btn ${etape < 3 ? 'tb-btn--marine' : 'tb-btn--corail'}`} disabled={progression !== null || preparation}>
              {etape < 3 ? 'Continuer' : progression !== null ? 'Envoi…' : 'Envoyer mon souvenir'}
            </button>
          </div>
        </form>
      </div>

      <aside className="tb-depot__apercu" aria-label="Aperçu de ton polaroïd">
        <p className="tb-manuscrit tb-annotation">aperçu dans la galerie</p>
        <Polaroid media={apercu} apercu />
      </aside>
    </div>
  )
}
