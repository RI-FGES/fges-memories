import { Fragment, createElement } from 'react'

// Remplace {variable} par sa valeur (texte ou élément), laisse le reste tel quel
function remplirVariables(texte, valeurs, prefixe) {
  return texte.split(/(\{\w+\})/g).map((morceau, i) => {
    const m = morceau.match(/^\{(\w+)\}$/)
    if (m && valeurs && m[1] in valeurs) return <Fragment key={`${prefixe}-${i}`}>{valeurs[m[1]]}</Fragment>
    return morceau
  })
}

// Met en forme un texte modifiable : **gras**, retours à la ligne et {variables}
function formater(texte, valeurs) {
  return String(texte ?? '').split('\n').map((ligne, l) => (
    <Fragment key={l}>
      {l > 0 && <br />}
      {ligne.split(/(\*\*[^*]+\*\*)/g).map((bout, b) => {
        const gras = bout.match(/^\*\*([^*]+)\*\*$/)
        return gras
          ? <strong key={b}>{remplirVariables(gras[1], valeurs, `${l}-${b}`)}</strong>
          : <Fragment key={b}>{remplirVariables(bout, valeurs, `${l}-${b}`)}</Fragment>
      })}
    </Fragment>
  ))
}

// <Texte as="p" className="tb-texte" valeur={textes.accueil_intro} valeurs={{ debut: … }} />
export default function Texte({ as = 'p', valeur, valeurs, ...props }) {
  return createElement(as, props, formater(valeur, valeurs))
}
