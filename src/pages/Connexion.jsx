import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/contexte'
import { IconeAvion } from '../components/Icones'
import { MessageAccesReserve } from './AccesReserve'

const MESSAGES_ERREUR = {
  'auth/invalid-email': 'Cette adresse email n’est pas valide.',
  'auth/invalid-action-code': 'Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien.',
  'auth/expired-action-code': 'Ce lien a expiré. Demande un nouveau lien.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/quota-exceeded': 'Trop de demandes aujourd’hui. Réessaie plus tard.',
  'auth/invalid-credential': 'Email ou mot de passe de test incorrect.',
  'auth/operation-not-allowed': 'Ce mode de connexion n’est pas activé dans Firebase.',
}
const messageErreur = (e) => MESSAGES_ERREUR[e?.code] || e?.message || 'Une erreur est survenue.'

// Les personnes qui ont réduit les animations dans leur système les évitent ici aussi
const sansAnimation = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Durées de l'animation de départ (en millisecondes)
const DUREES = {
  ouverture: 450,   // le passeport arrive, puis s'ouvre
  tampon: 1300,     // on laisse le tampon « Accès autorisé » s'afficher
  fermeture: 950,   // le passeport se referme
  decollage: 1700,  // l'avion décolle, puis on arrive sur le site
}

// Page de connexion : le "contrôle des passeports"
export default function Connexion() {
  const { user, chargement, aAcces, envoyerLien, lienEnCours, emailMemorise, terminerConnexion, connexionTest, deconnexion } = useAuth()
  // Mode test : visible seulement avec « npm run dev », jamais sur le site en ligne
  const modeTestDispo = import.meta.env.DEV
  const [modeTest, setModeTest] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const destination = location.state?.depuis || '/'
  const [email, setEmail] = useState('')
  const [etape, setEtape] = useState(lienEnCours ? (emailMemorise ? 'verification' : 'confirmer-email') : 'saisie')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const tentative = useRef(false)

  // Animation : 'ferme' → 'ouvert' → (connexion réussie) → 'fermeture' → 'decollage'
  const [animation, setAnimation] = useState('ferme')

  // À l'arrivée sur la page, le passeport s'ouvre
  useEffect(() => {
    const t = setTimeout(() => setAnimation('ouvert'), sansAnimation() ? 0 : DUREES.ouverture)
    return () => clearTimeout(t)
  }, [])

  // Retour depuis le lien reçu par email, sur le même appareil
  useEffect(() => {
    if (!lienEnCours || !emailMemorise || tentative.current) return
    tentative.current = true
    terminerConnexion()
      .then(() => setEtape('autorise'))
      .catch(e => { setErreur(messageErreur(e)); setEtape('saisie') })
  }, [lienEnCours, emailMemorise, terminerConnexion])

  // Connexion réussie : on attend la vérification de la liste des étudiants en échange
  const verifie = etape === 'autorise' && !chargement && !!user
  const autorise = verifie && aAcces
  const refuse = verifie && !aAcces

  // Autorisé : tampon, le passeport se referme, l'avion décolle… et hop, sur le site
  useEffect(() => {
    if (!autorise) return
    if (sansAnimation()) {
      const t = setTimeout(() => navigate(destination, { replace: true }), 900)
      return () => clearTimeout(t)
    }
    const t1 = setTimeout(() => setAnimation('fermeture'), DUREES.tampon)
    const t2 = setTimeout(() => setAnimation('decollage'), DUREES.tampon + DUREES.fermeture)
    const t3 = setTimeout(
      () => navigate(destination, { replace: true }),
      DUREES.tampon + DUREES.fermeture + DUREES.decollage,
    )
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [autorise, navigate, destination])

  // Déjà connecté en arrivant sur la page : direction le site, sans animation
  if (!chargement && user && etape === 'saisie' && !envoi) return <Navigate to={destination} replace />

  async function demanderLien(e) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      await envoyerLien(email)
      setEtape('envoye')
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  async function seConnecterEnTest(e) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      await connexionTest(email, motDePasse)
      setEtape('autorise')
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  // Lien ouvert sur un autre appareil : on redemande l'email
  async function confirmerEmail(e) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      await terminerConnexion(email)
      setEtape('autorise')
    } catch (err) {
      setErreur(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  const ouvert = animation === 'ouvert'

  return (
    <div className={`tb-connexion tb-connexion--${animation}`}>
      <p className="tb-connexion__bon-voyage tb-manuscrit" aria-hidden="true">Bon voyage !</p>
      <div className="tb-connexion__tampon-deco" aria-hidden="true">
        <span>LILLE</span><strong>DÉPART</strong><span>FGES</span>
      </div>

      <div className={`tb-passeport ${ouvert ? 'is-ouvert' : ''}`}>
        {/* Place de la couverture une fois le passeport ouvert (le feuillet vient s'y poser) */}
        <div className="tb-passeport__gauche" aria-hidden="true" />

        {/* En-tête affiché uniquement sur téléphone */}
        <div className="tb-passeport__bandeau" aria-hidden="true">
          <IconeAvion taille={26} />
          <span>PASSEPORT</span>
        </div>

        <div className="tb-passeport__page" inert={!ouvert}>
          <p className="tb-surtitre tb-surtitre--corail">Contrôle des passeports</p>

          {etape === 'saisie' && (
            <>
              <h1 className="tb-passeport__h1">Prêt·e à embarquer&nbsp;?</h1>
              <p className="tb-texte">Connecte-toi avec ton adresse universitaire pour coller tes souvenirs dans le carnet et voter pour ceux des autres.</p>
              <form onSubmit={modeTest ? seConnecterEnTest : demanderLien} className="tb-form">
                <label htmlFor="email" className="tb-label">Email universitaire</label>
                <input
                  id="email"
                  type="email"
                  className="tb-input"
                  autoComplete="email"
                  placeholder="prenom.nom@…"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErreur('') }}
                  required
                />
                {modeTest && (
                  <>
                    <label htmlFor="mdp-test" className="tb-label">Mot de passe de test</label>
                    <input
                      id="mdp-test"
                      type="password"
                      className="tb-input"
                      autoComplete="current-password"
                      value={motDePasse}
                      onChange={e => { setMotDePasse(e.target.value); setErreur('') }}
                      required
                    />
                  </>
                )}
                {erreur && <p className="tb-erreur" role="alert">{erreur}</p>}
                <button type="submit" className="tb-btn tb-btn--marine tb-btn--large" disabled={envoi}>
                  <IconeAvion taille={18} />{' '}
                  {envoi ? 'Vérification…' : modeTest ? 'Embarquer (mode test)' : 'Recevoir mon lien d’embarquement'}
                </button>
              </form>
              <p className="tb-note">
                {modeTest ? 'Mode test : compte créé dans la console Firebase.' : 'Pas de mot de passe : un lien de connexion t’est envoyé par email.'}
              </p>
              {modeTestDispo && (
                <button type="button" className="tb-lien-discret" onClick={() => { setModeTest(!modeTest); setErreur('') }}>
                  {modeTest ? '← Revenir au lien par email' : 'Connexion test (mot de passe)'}
                </button>
              )}
            </>
          )}

          {etape === 'envoye' && (
            <>
              <h1 className="tb-passeport__h1">Regarde ta boîte mail</h1>
              <p className="tb-texte">Un lien d’embarquement vient d’être envoyé à <strong>{email}</strong>. Clique dessus pour te connecter.</p>
              <p className="tb-note">Rien reçu après quelques minutes ? Vérifie tes spams, ou recommence.</p>
              <button type="button" className="tb-btn tb-btn--contour" onClick={() => setEtape('saisie')}>Changer d’adresse</button>
            </>
          )}

          {etape === 'verification' && (
            <>
              <h1 className="tb-passeport__h1">Vérification en cours…</h1>
              <p className="tb-texte">On tamponne ton passeport.</p>
            </>
          )}

          {etape === 'confirmer-email' && (
            <>
              <h1 className="tb-passeport__h1">Une dernière vérification</h1>
              <p className="tb-texte">Tu as ouvert le lien sur un autre appareil. Confirme ton adresse universitaire pour terminer la connexion.</p>
              <form onSubmit={confirmerEmail} className="tb-form">
                <label htmlFor="email-confirm" className="tb-label">Email universitaire</label>
                <input
                  id="email-confirm"
                  type="email"
                  className="tb-input"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErreur('') }}
                  required
                />
                {erreur && <p className="tb-erreur" role="alert">{erreur}</p>}
                <button type="submit" className="tb-btn tb-btn--marine tb-btn--large" disabled={envoi}>
                  {envoi ? 'Vérification…' : 'Embarquer'}
                </button>
              </form>
            </>
          )}

          {etape === 'autorise' && !verifie && (
            <>
              <h1 className="tb-passeport__h1">Vérification en cours…</h1>
              <p className="tb-texte">On cherche ton nom sur la liste des voyageurs.</p>
            </>
          )}

          {refuse && (
            <MessageAccesReserve onDeconnexion={() => deconnexion().then(() => setEtape('saisie'))} />
          )}

          {autorise && (
            <>
              <h1 className="tb-passeport__h1">Bienvenue à bord !</h1>
              <p className="tb-texte">Ton passeport est validé.</p>
              <div className="tb-tampon-acces" aria-live="polite">Accès autorisé</div>
            </>
          )}

          <p className="tb-passeport__mrz" aria-hidden="true">
            P&lt;FGES&lt;&lt;MEMORIES&lt;&lt;OUTGOING&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </p>
        </div>

        {/* La couverture : un feuillet qui pivote comme une vraie page */}
        <div className="tb-passeport__feuillet" aria-hidden="true">
          <div className="tb-passeport__recto">
            <p className="tb-passeport__universite">Université Catholique de Lille · FGES</p>
            <div className="tb-passeport__embleme">
              <div><IconeAvion taille={52} /></div>
            </div>
            <p className="tb-passeport__titre">PASSEPORT</p>
            <p className="tb-passeport__sous-titre">FGES Memories · Outgoing</p>
          </div>
          <div className="tb-passeport__verso">
            <p className="tb-passeport__universite">Page d’identité</p>
            <div className="tb-passeport__embleme">
              <div><IconeAvion taille={52} /></div>
            </div>
            <dl className="tb-passeport__identite">
              <div><dt>Titulaire</dt><dd>Étudiant·e FGES</dd></div>
              <div><dt>Destination</dt><dd>Le monde entier</dd></div>
              <div><dt>Lieu d’émission</dt><dd>Lille</dd></div>
              <div><dt>Validité</dt><dd>Tous les souvenirs</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <Link to="/donnees-personnelles" className="tb-connexion__mentions">Données personnelles</Link>

      {/* Le décollage */}
      {animation === 'decollage' && (
        <div className="tb-decollage" aria-hidden="true">
          <span className="tb-decollage__nuage tb-decollage__nuage--1" />
          <span className="tb-decollage__nuage tb-decollage__nuage--2" />
          <span className="tb-decollage__nuage tb-decollage__nuage--3" />
          <svg className="tb-decollage__trace" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <path d="M -20 560 C 250 540, 520 430, 1040 -20" />
          </svg>
          <div className="tb-decollage__avion"><IconeAvion taille={64} /></div>
          <p className="tb-decollage__texte tb-manuscrit">Bon vol !</p>
        </div>
      )}
    </div>
  )
}
