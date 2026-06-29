# Estudio de Valor — Landing page

Sitio estático (una sola página) listo para publicar en **Railway** desde **GitHub**.
El HTML es autocontenido: la foto y las fuentes ya están incrustadas en `index.html`,
así que no hay dependencias externas que instalar para que el sitio se vea.

---

## Contenido de la carpeta

| Archivo          | Para qué sirve                                                        |
|------------------|----------------------------------------------------------------------|
| `index.html`     | La landing completa, autocontenida (foto + fuentes incrustadas).     |
| `server.js`      | Servidor web mínimo en Node, sin dependencias. Lee el puerto de Railway. |
| `package.json`   | Define el comando de arranque (`npm start` → `node server.js`).      |
| `railway.json`   | Configuración de despliegue para Railway.                            |
| `Procfile`       | Comando de arranque alternativo (compatibilidad).                    |
| `.gitignore`     | Evita subir archivos innecesarios.                                   |

---

## Probar en tu computadora (opcional)

Necesitas Node 18 o superior.

```bash
npm start
```

Luego abre http://localhost:3000 en tu navegador.

---

## Paso 1 — Subir a GitHub

1. Crea un repositorio nuevo y vacío en https://github.com/new
   (por ejemplo: `estudio-de-valor-landing`). **No** marques "Add a README".
2. Descomprime este `.zip`. Dentro de la carpeta, abre una terminal y ejecuta:

   ```bash
   git init
   git add .
   git commit -m "Landing Estudio de Valor"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/estudio-de-valor-landing.git
   git push -u origin main
   ```

   > Si prefieres no usar la terminal: en la página del repositorio usa
   > **"uploading an existing file"** y arrastra todos los archivos de la carpeta.

---

## Paso 2 — Publicar en Railway

1. Entra a https://railway.app e inicia sesión con GitHub.
2. **New Project → Deploy from GitHub repo** y elige el repositorio que acabas de subir.
3. Railway detecta Node automáticamente, instala y ejecuta `node server.js`.
   No hay que configurar variables de entorno: el `PORT` lo asigna Railway solo.
4. Cuando termine el despliegue, abre **Settings → Networking → Generate Domain**
   para obtener la URL pública (algo como `https://estudio-de-valor.up.railway.app`).

¡Listo! Esa URL es la prueba del sitio que puedes compartir.

---

## Cómo actualizar el sitio

Cualquier cambio que hagas en `index.html` (o que te entreguen actualizado),
súbelo a GitHub con un nuevo commit:

```bash
git add .
git commit -m "Actualiza landing"
git push
```

Railway vuelve a desplegar automáticamente con cada `push`.

---

## Notas

- El botón **"Responde las 10 preguntas"** ya está conectado al formulario de Google
  (`https://forms.gle/Xxppw56AHtbfJM8f7`) y abre en una pestaña nueva. Para cambiarlo,
  edita el archivo fuente y vuelve a generar `index.html`.
- El diseño es **mobile-first y responsivo** (móvil → tablet → escritorio), con maquetación
  fluida que se adapta a cualquier ancho de pantalla.
- La foto de Jorge ya viene recortada e incrustada; no necesitas subirla por separado.
