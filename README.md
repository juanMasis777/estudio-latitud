# Estudio Latitud

Herramienta personal de producción para el canal **Latitud Oscura**: convierte un guion en escenas, busca imágenes y clips con licencia para cada una y (en próximas fases) arma el video.

Corre en tu PC. No se despliega en Vercel porque el render de video necesita FFmpeg y procesos largos.

## Estado

| Fase | Qué hace | Estado |
|---|---|---|
| 1 | Guion → escenas con Claude · búsqueda en Pixabay (videos y fotos), Wikimedia Commons y Pexels (opcional) · selección por escena · créditos | ✅ |
| 2 | Descarga de recursos · recortes de 10 s con FFmpeg · alinear escenas con tu narración | Pendiente |
| 3 | Render del video (Ken Burns, subtítulos, música) | Pendiente |
| 4 | Imágenes IA de respaldo · Library of Congress · Internet Archive | Pendiente |

## Requisitos

- Node.js 20 o superior
- Una clave de la API de Anthropic: https://console.anthropic.com/
- Una clave gratuita de Pixabay: https://pixabay.com/api/docs/ (inicia sesión y aparece en esa página)
- Opcional: clave de Pexels (la emisión de claves nuevas está pausada desde oct 2026)

## Instalación (Windows, PowerShell)

```powershell
cd estudio-latitud
npm install
copy .env.example .env.local
code .env.local   # pega tus claves y guarda
npm run dev
```

Abre http://localhost:3000

## Cómo se usa

1. Escribe el título y pega el guion completo (con tus indicaciones de edición; Claude solo toma la narración).
2. Pulsa **Dividir en escenas**. Cada escena trae duración estimada, tipo (histórica o ambiente) y 3 búsquedas en inglés.
3. En cada escena, toca una búsqueda o escribe la tuya, elige la fuente y haz clic en el recurso que quieras.
4. Marca **Usar imagen IA** si no encuentras material real.
5. **Ver créditos** genera el texto para la descripción de YouTube.

Los proyectos se guardan automáticamente en `proyectos/<titulo>.json` (no se suben a GitHub).

## Reglas de uso de las fuentes

- **Pixabay**: uso gratuito y con modificaciones; no exige atribución (la app la incluye igual). Prohíbe usos engañosos o inmorales, en especial con personas reconocibles. Las fotos llegan a 1280 px como máximo; para fotos históricas usa Wikimedia.
- **Pexels**: hay que acreditar a Pexels y, cuando sea posible, al autor. Las personas identificables no pueden aparecer bajo una mala luz (delitos, enfermedad, etc.). En escenas marcadas como *tema sensible*, usa solo lugares, objetos o paisajes.
- **Wikimedia Commons**: cada archivo tiene su licencia. La app descarta automáticamente las licencias no comerciales (NC) y sin obras derivadas (ND). Las CC BY y CC BY-SA exigen atribución: los créditos ya la incluyen.
- La duración de cada escena es una **estimación** (~2.5 palabras por segundo). En la Fase 2 se ajusta con tu audio real.

## Estructura

```
app/
  page.js                 Interfaz
  api/escenas/            POST guion → escenas (Claude)
  api/buscar/             POST consulta + fuente → resultados
  api/proyectos/          GET lista · PUT guardar
  api/proyectos/[id]/     GET un proyecto
lib/
  claude.js               División del guion en escenas
  proyectos.js            Guardado en JSON local
  fuentes/pixabay.js
  fuentes/pexels.js
  fuentes/wikimedia.js
```
