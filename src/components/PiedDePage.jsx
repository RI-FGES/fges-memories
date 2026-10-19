import { Link } from 'react-router-dom'

export default function PiedDePage() {
  return (
    <footer className="tb-pied">
      <span>FGES Memories · Service des Relations Internationales · Université Catholique de Lille</span>
      <Link to="/donnees-personnelles">Données personnelles</Link>
    </footer>
  )
}
