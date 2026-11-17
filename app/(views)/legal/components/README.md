# Components — componentes legales y transversales

Aquí se agrupan los componentes reutilizables relacionados con el área legal.
`cookies/` contiene el aviso y las preferencias de cookies; también publica su
componente mediante `index.tsx`. `preferencias.tsx` centraliza el idioma y las
preferencias visuales que utilizan el portal, el login y el dashboard.

Se mantienen dentro de `legal` porque forman parte del consentimiento,
privacidad y derechos ARCO. Sus estilos están en CSS Modules y la interacción
se ejecuta como Client Component cuando usa `window`, cookies o eventos del
navegador.
