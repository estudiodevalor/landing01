# Despliegue y operación

> Última verificación: **4 de agosto de 2026**.
> Léelo antes de tocar `server.js`.
>
> **CIC-270 (2026-11-06):** `/cicrei/*` ya NO sirve la carpeta `cicrei/`: `server.js` redirige con 301 a `https://cicrei.estudioedv.com` (misma ruta y query string). Los cambios de la landing de CICREI se hacen en `edv-landings-codigo` (`sitios/cicrei`), no aquí. La carpeta `cicrei/` se borró en CIC-272 (sigue en el historial de git, commit `b99a8d4`).

---

## Qué publica este repo

Este repo sirve **un solo sitio**:

| URL pública | Se sirve desde |
|---|---|
| `https://www.estudiodevalor.com/` | `index.html` (raíz del repo) |
| `https://www.estudiodevalor.com/cicrei/*` | no se sirve: `server.js` responde 301 a `https://cicrei.estudioedv.com` (misma ruta y query string) |

### Dónde vive en Railway

| | |
|---|---|
| Proyecto | `hospitable-reprieve` |
| Servicio | `web` |
| Dominio interno | `web-production-df8fa.up.railway.app` |
| Dominio público | `www.estudiodevalor.com` (dominio personalizado) |
| Rama que publica | `main` |

**Cuidado con los nombres.** Existe otro proyecto de Railway llamado
**"Estudio de valor / Cicrei"** (repo `estudiodevalor/Cicrei`) que suena como si fuera este,
pero **no** sirve `estudiodevalor.com` — su dominio es `estudiojgc.com` y publica una copia
independiente de la landing de CICREI. No confundas los dos al desplegar.

---

## Cómo publicar un cambio

El servicio tiene **autodeploy**: un `push` a `main` publica en producción.

```bash
# 1. editar lo que corresponda
#    index.html         -> la home de Estudio de Valor
#    (la landing de CICREI se edita en edv-landings-codigo, sitios/cicrei)

# 2. probar en local ANTES de publicar
PORT=4021 node server.js
#    http://localhost:4021/          -> home
#    http://localhost:4021/cicrei/?utm_source=x -> debe dar 301 a https://cicrei.estudioedv.com/?utm_source=x

# 3. publicar
git add . && git commit -m "..." && git push origin main
```

El despliegue tarda **1-2 minutos**. Para confirmar en producción:

```bash
curl -s "https://www.estudiodevalor.com/?cb=$RANDOM" | grep -i "lo-que-agregaste"
```

Usa siempre el `?cb=...`: hay Cloudflare delante y una respuesta cacheada te haría creer
que el despliegue falló.

> **Publica siempre por `git push`.** Subir archivos a mano al servicio (upload directo)
> deja el repo diciendo una cosa y el sitio mostrando otra. Ya pasó una vez: ver el
> antecedente al final.

---

## ⚠️ La CSP bloquea cualquier script de terceros

`server.js` envía una cabecera `Content-Security-Policy` con **lista blanca por dominio**.
Pegar un `<script>` de terceros en el `<head>` **no basta**: el navegador lo bloquea en
silencio, sin error visible en la página, y la herramienta de turno reporta
"no se detecta la instalación" sin decir por qué.

Al agregar cualquier analítica, píxel, chat o A/B testing, añade su dominio en `server.js`:

| Directiva | Para qué |
|---|---|
| `script-src` | poder cargar el script |
| `connect-src` | que pueda enviar datos de vuelta |
| `img-src` | si usa píxeles de rastreo |

**Ya instalado:** el tag de **Contentsquare** (`76b5ead5ae20f`) estaba en el `<head>` de la landing de CICREI,
que ahora vive en `edv-landings-codigo` (`sitios/cicrei`, con su propio `_headers`). La CSP de este
`server.js` conserva sus dominios por si la home lo necesita.

### Un proveedor puede usar más de un dominio

Contentsquare necesita **dos**, y permitir solo uno no da error visible en la página:

| Dominio | Para qué |
|---|---|
| `*.contentsquare.net` | el tag (`t.`), recursos (`srm.ba.`) y la recolección (`c.ba.`, `k.ba.`, `q.ba.`, `r.`, `l.`) |
| `*.contentsquare.com` | `tcvsapi.` reporta el resultado de "Verify installation"; `app.` es el `uxaDomain` |

Con solo el `.net`, el tag carga y mide bien, pero el botón **"Verify installation"** del
panel de Contentsquare falla con *"Error reporting verification results"* — porque el
reporte va al `.com` y la CSP lo bloquea. Costó un ciclo de depuración averiguarlo.

**Cómo diagnosticar esto rápido:** descarga el script del proveedor y busca los dominios
que menciona, en vez de adivinar:

```bash
curl -s "https://t.contentsquare.net/uxa/<TAG_ID>.js" -o tag.js
grep -oE '[a-zA-Z0-9._-]+\.(com|net|io)' tag.js | sort -u
```

También revisa la consola del navegador: los bloqueos de CSP se reportan ahí explícitamente
("Refused to connect to ... because it violates the following Content Security Policy").

Nota aparte: `worker-src` **no** hereda de `script-src` sino de `default-src`. Si un tag
crea Web Workers desde `blob:` (el session replay de Contentsquare lo hace), hay que
declararlo por separado — ya está puesto.

---

## Cómo saber qué servicio sirve un dominio

Si algo no aparece en producción, lo primero es confirmar que estás desplegando en el
servicio correcto. La consulta global `projects` devuelve *Not Authorized*: hay que
preguntar proyecto por proyecto. El token está en `~/.railway/config.json`
(campo `user.accessToken`):

```bash
curl -s https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"query { project(id: \"<PROJECT_ID>\") { name services { edges { node { name serviceInstances { edges { node { domains { serviceDomains { domain } customDomains { domain } } } } } } } } } }"}'
```

Los `customDomains` son la respuesta: ahí se ve qué dominio público apunta a cada servicio.

---

## Antecedente

En julio de 2026, el otro repo (`estudiodevalor/Cicrei`) quedó con su rama principal en un
commit de *revert* — la landing vieja de 3 páginas — mientras el servicio publicaba una
versión más nueva subida a mano por upload directo. El repo y lo publicado decían cosas
distintas, y cualquier `push` habría reemplazado la landing en vivo por la versión antigua.

Se corrigió el 4 de agosto de 2026 sincronizando esa rama con lo que estaba desplegado.
De ahí la regla de arriba: **el repo es la fuente de verdad, publica por `push`.**
