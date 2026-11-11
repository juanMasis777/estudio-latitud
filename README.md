# Estudio Latitud

Herramienta personal de producción para el canal **Latitud Oscura**. Convierte un guion en escenas, te ayuda a elegir imágenes y clips con licencia para cada una, ajusta las escenas a tu narración grabada y **arma el video final** en MP4.

Corre en tu PC. No se despliega en Vercel porque el render de video necesita FFmpeg y procesos largos.

## Qué hace

| Paso | Qué hace |
|---|---|
| Guion → escenas | Claude divide el guion en escenas de 5–15 s, ignora las indicaciones de edición, propone búsquedas en inglés y títulos de capítulo. |
| Recursos | Búsqueda en **Wikimedia Commons**, **Library of Congress**, **Internet Archive**, **Pixabay** y **Pexels** (opcional). Cada recurso guarda autor y licencia. También puedes **subir tus propias imágenes o videos**. |
| Imágenes IA | Botón **Generar prompt IA** con el estilo fijo del canal. Generas la imagen en ChatGPT o Canva y la subes a la escena. |
| Narración | Subes tu audio. La app detecta tus pausas con FFmpeg y ajusta el inicio y la duración de cada escena a tu voz real. |
| Render | Fotos con efecto **Ken Burns**, videos recortados (con bucle si son cortos), imágenes verticales o 4:3 con los lados desenfocados, entrada con corte o fundido, narración + música de fondo. MP4 1920×1080 a 30 fps. |
| Publicar | Subtítulos `.srt`, capítulos con tiempos reales, créditos para la descripción y una carpeta de clips numerados para retocar en Filmora. |

## Requisitos

- Node.js 20 o superior
- Clave de la API de Anthropic: https://console.anthropic.com/
- Clave gratuita de Pixabay: https://pixabay.com/api/docs/ (inicia sesión y aparece en esa página)
- Opcional: clave de Pexels (la emisión de claves nuevas está pausada desde oct 2026)
- FFmpeg **no hace falta instalarlo**: viene con `npm install` (paquete `ffmpeg-static`).

## Instalación (Windows, PowerShell)

```powershell
cd estudio-latitud
npm install
copy .env.example .env.local
code .env.local   # pega tus claves y guarda
npm run dev
```

Abre http://localhost:3000

Si ya lo tenías instalado, después de `git pull` ejecuta `npm install` otra vez para que se descargue FFmpeg.

## Cómo se usa

1. **Nuevo video:** escribe el título, pega el guion completo y pulsa **Dividir en escenas**.
2. **Tu narración:** sube tu audio grabado. Las escenas pasan a mostrar «(con tu voz)» con su duración real.
3. **Recursos:** en cada escena toca una búsqueda sugerida o escribe la tuya, elige la fuente y haz clic en el recurso. Para clips de video puedes elegir en qué segundo empieza; para fotos, el movimiento.
   - Sin material real: **Generar prompt IA** → crea la imagen → **Subir imagen o video propio** (marca «Es una imagen generada con IA»).
4. **Música (opcional):** sube una pista de la Biblioteca de audio de YouTube y ajusta el volumen.
5. **Renderizar video:** verás el progreso por escena. Al terminar puedes ver el video, descargarlo, descargar los subtítulos o abrir la carpeta de clips para Filmora.
6. **Publicar:** copia los capítulos y los créditos para la descripción de YouTube.

Volver a renderizar solo procesa las escenas que cambiaste.

## Dónde quedan los archivos

```
proyectos/<video>.json        datos del proyecto (escenas, elecciones)
medios/<video>/
  narracion/  musica/  propios/   lo que subiste
  bruto/                          descargas y caché de clips
  clips/                          001_e001.mp4, 002_e002.mp4… + narración + subtítulos (para Filmora)
  salida/                         <video>.mp4, subtitulos.srt, capitulos.txt, creditos.txt
```

Ninguna de estas carpetas se sube a GitHub.

## Reglas de uso de las fuentes

- **Wikimedia Commons:** cada archivo tiene su licencia. La app descarta las no comerciales (NC) y sin obras derivadas (ND). CC BY y CC BY-SA exigen atribución: los créditos ya la incluyen.
- **Library of Congress:** solo se muestran fotos marcadas «No known restrictions» o de dominio público. Si la API no indica los derechos, la foto no aparece.
- **Internet Archive:** solo películas con licencia de dominio público o Creative Commons sin NC/ND. **Ojo:** ahí la licencia la declara quien sube el archivo; revisa la página original antes de publicar. La app recorta solo el tramo que necesitas.
- **Pixabay:** uso gratuito con modificaciones; no exige atribución (la app la incluye igual). Las fotos llegan a 1280 px; para fotos históricas usa Wikimedia.
- **Pexels:** hay que acreditar a Pexels y, cuando sea posible, al autor. Las personas identificables no pueden aparecer bajo una mala luz.
- En escenas marcadas como *tema sensible*, usa solo lugares, objetos o paisajes.
- Si usas imágenes IA realistas que recrean hechos reales, marca «contenido alterado o sintético» al subir el video.

## Problemas comunes

- **«No se encontró FFmpeg»:** ejecuta `npm install` de nuevo. Si sigue, instala FFmpeg y pon la ruta en `FFMPEG_PATH` dentro de `.env.local`.
- **Una escena sale como pantalla oscura con una franja ámbar:** no tiene recurso o no se pudo descargar. El panel de render dice cuál.
- **El proyecto está en OneDrive:** muévelo fuera (por ejemplo a `C:\Users\<tu usuario>\Proyectos`). OneDrive bloquea archivos mientras sincroniza y los videos ocupan mucho espacio.

## Estructura

```
app/
  page.js                         Inicio y editor
  componentes/                    PanelAudio, TarjetaEscena, PanelRender (+ Publicar), utilidades
  api/escenas/                    POST guion → escenas (Claude)
  api/buscar/                     GET fuentes · POST búsqueda
  api/prompt-ia/                  POST prompt de imagen con el estilo del canal
  api/proyectos/                  GET lista · PUT guardar
  api/proyectos/[id]/             GET proyecto
  api/proyectos/[id]/archivo/     POST/DELETE narración, música o archivo propio de una escena
  api/proyectos/[id]/render/      POST iniciar render · GET progreso
  api/proyectos/[id]/abrir/       POST abrir carpeta en el explorador
  api/medios/[id]/[...ruta]/      GET archivos del proyecto (con rangos para el reproductor)
lib/
  claude.js        escenas, capítulos y prompts IA
  ffmpeg.js        ejecutar FFmpeg, leer duración y detectar pausas
  alineacion.js    ajustar escenas a la narración
  render.js        clips, Ken Burns, unión y mezcla de audio
  textos.js        subtítulos, capítulos y créditos
  medios.js        rutas seguras, descargas y subidas
  proyectos.js     guardado en JSON local
  fuentes/         wikimedia, loc, archive, pixabay, pexels
```
