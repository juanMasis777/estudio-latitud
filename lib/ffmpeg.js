import { spawn } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Orden de búsqueda: FFMPEG_PATH en .env.local → binario de ffmpeg-static → "ffmpeg" del sistema.
function rutaFFmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const ruta = require("ffmpeg-static");
    if (ruta) return ruta;
  } catch {
    // ffmpeg-static no instalado: se usa el del sistema.
  }
  return "ffmpeg";
}

export function ejecutarFFmpeg(args, { alProgreso } = {}) {
  return new Promise((resolve, reject) => {
    const proceso = spawn(/*turbopackIgnore: true*/ rutaFFmpeg(), ["-hide_banner", "-nostdin", ...args], {
      windowsHide: true,
    });
    let stderr = "";
    proceso.stderr.on("data", (trozo) => {
      const texto = trozo.toString();
      stderr += texto;
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
      if (alProgreso) {
        const m = texto.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (m) alProgreso(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
      }
    });
    proceso.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "No se encontró FFmpeg. Ejecuta `npm install` otra vez o define FFMPEG_PATH en .env.local."
          )
        );
      } else reject(error);
    });
    proceso.on("close", (codigo) => {
      if (codigo === 0) resolve(stderr);
      else {
        const ultimas = stderr.trim().split("\n").slice(-6).join("\n");
        reject(new Error(`FFmpeg falló (código ${codigo}):\n${ultimas}`));
      }
    });
  });
}

// Lee duración y dimensiones con `ffmpeg -i` (sin ffprobe).
export async function inspeccionar(archivo) {
  let salida = "";
  try {
    salida = await ejecutarFFmpeg(["-i", archivo, "-f", "null", "-t", "0", "-"]);
  } catch (error) {
    salida = error.message;
  }
  const d = salida.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  const v = salida.match(/Stream #\d+:\d+.*?: Video: .*?, (\d{2,5})x(\d{2,5})/);
  const tieneAudio = /Stream #\d+:\d+.*?: Audio:/.test(salida);
  return {
    duracion: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : null,
    ancho: v ? Number(v[1]) : null,
    alto: v ? Number(v[2]) : null,
    tieneAudio,
  };
}

// Devuelve los silencios del audio: [{inicio, fin}]
export async function detectarSilencios(archivo, { ruido = "-35dB", minimo = 0.25 } = {}) {
  const salida = await ejecutarFFmpeg([
    "-i",
    archivo,
    "-af",
    `silencedetect=noise=${ruido}:d=${minimo}`,
    "-f",
    "null",
    "-",
  ]);
  const silencios = [];
  let inicio = null;
  for (const linea of salida.split("\n")) {
    const a = linea.match(/silence_start: (-?\d+(\.\d+)?)/);
    const b = linea.match(/silence_end: (\d+(\.\d+)?)/);
    if (a) inicio = Math.max(0, Number(a[1]));
    if (b && inicio !== null) {
      silencios.push({ inicio, fin: Number(b[1]) });
      inicio = null;
    }
  }
  if (inicio !== null) silencios.push({ inicio, fin: null });
  return silencios;
}
