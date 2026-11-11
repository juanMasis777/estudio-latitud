import { promises as fs } from "fs";
import path from "path";
import { ejecutarFFmpeg, inspeccionar } from "./ffmpeg.js";
import {
  asegurarCarpeta,
  carpetaProyecto,
  descargar,
  existe,
  extension,
  huella,
  rutaDentro,
  rutaRelativa,
} from "./medios.js";
import { leerProyecto } from "./proyectos.js";
import { duracionEscena, inicioEscena } from "./alineacion.js";
import { generarCapitulos, generarCreditos, generarSRT } from "./textos.js";

const FPS = 30;
const ANCHO = 1920;
const ALTO = 1080;
const MOVIMIENTOS = ["zoom-in", "pan-der", "zoom-out", "pan-izq"];
const CODIFICACION = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS)];

// ---------- Estado del render (archivo render.json en la carpeta del proyecto) ----------

function rutaEstado(id) {
  return path.join(carpetaProyecto(id), "render.json");
}

export async function leerEstado(id) {
  try {
    return JSON.parse(await fs.readFile(rutaEstado(id), "utf8"));
  } catch {
    return { estado: "inactivo" };
  }
}

// Las escrituras se encadenan para que dos actualizaciones no se pisen.
const colas = new Map();
function escribirEstado(id, estado) {
  const anterior = colas.get(id) || Promise.resolve();
  const siguiente = anterior
    .catch(() => {})
    .then(async () => {
      await asegurarCarpeta(carpetaProyecto(id));
      await fs.writeFile(rutaEstado(id), JSON.stringify({ ...estado, actualizado: Date.now() }, null, 2));
    });
  colas.set(id, siguiente);
  return siguiente;
}

export async function renderEnCurso(id) {
  const e = await leerEstado(id);
  // Si un render quedó colgado (servidor cerrado), se libera a los 15 minutos sin cambios.
  return e.estado === "trabajando" && Date.now() - (e.actualizado || 0) < 15 * 60 * 1000;
}

// ---------- Filtros ----------

// Ajusta cualquier imagen o video a 16:9. Si la proporción es distinta,
// rellena los lados con la misma imagen desenfocada en lugar de recortarla.
function filtroComponer(ancho, alto, w, h) {
  const proporcion = w && h ? w / h : ANCHO / ALTO;
  if (Math.abs(proporcion - ANCHO / ALTO) < 0.03) {
    return `scale=${w2(ancho)}:${w2(alto)}:force_original_aspect_ratio=increase:flags=lanczos,crop=${ancho}:${alto},setsar=1`;
  }
  return (
    `split[fondo][frente];` +
    `[fondo]scale=${ancho}:${alto}:force_original_aspect_ratio=increase,crop=${ancho}:${alto},boxblur=40:4,eq=brightness=-0.18[f];` +
    `[frente]scale=${ancho}:${alto}:force_original_aspect_ratio=decrease:flags=lanczos[p];` +
    `[f][p]overlay=(W-w)/2:(H-h)/2,setsar=1`
  );
}

function w2(n) {
  return n % 2 === 0 ? n : n + 1;
}

// Efecto Ken Burns: movimiento lento sobre la foto (8 %).
function filtroKenBurns(movimiento, cuadros) {
  const n = Math.max(1, cuadros - 1);
  const centroY = "ih/2-(ih/zoom/2)";
  const centroX = "iw/2-(iw/zoom/2)";
  let z, x, y;
  switch (movimiento) {
    case "zoom-out":
      z = `1.08-0.08*on/${n}`;
      x = centroX;
      y = centroY;
      break;
    case "pan-der":
      z = "1.08";
      x = `(iw-iw/zoom)*on/${n}`;
      y = centroY;
      break;
    case "pan-izq":
      z = "1.08";
      x = `(iw-iw/zoom)*(1-on/${n})`;
      y = centroY;
      break;
    case "fijo":
      z = "1";
      x = "0";
      y = "0";
      break;
    default:
      z = `1+0.08*on/${n}`;
      x = centroX;
      y = centroY;
  }
  return `zoompan=z='${z}':x='${x}':y='${y}':d=${cuadros}:s=${ANCHO}x${ALTO}:fps=${FPS}`;
}

function filtroTransicion(escena) {
  return escena.transicion === "fundido" ? ",fade=t=in:st=0:d=0.5" : "";
}

// ---------- Recursos de cada escena ----------

async function prepararFuente(id, escena, duracion) {
  const bruto = await asegurarCarpeta(rutaDentro(id, "bruto"));
  const recorte = Math.max(0, Number(escena.recorte_inicio) || 0);

  if (escena.archivo_propio?.ruta) {
    const ruta = rutaDentro(id, escena.archivo_propio.ruta);
    return { tipo: escena.archivo_propio.tipo, ruta, recorte };
  }

  const sel = escena.seleccion;
  if (!sel?.archivo) return null;

  if (sel.tipo === "foto") {
    const destino = path.join(bruto, `${escena.id}-${huella(sel.archivo)}${extension(sel.archivo, ".jpg")}`);
    if (!(await existe(destino))) await descargar(sel.archivo, destino);
    return { tipo: "foto", ruta: destino };
  }

  // Video: se extrae solo el tramo necesario, directamente desde la URL.
  const largo = Math.min(duracion + 1, 60);
  const destino = path.join(bruto, `${escena.id}-${huella(sel.archivo, recorte, largo)}.mp4`);
  if (!(await existe(destino))) {
    const temporal = destino.replace(/\.mp4$/, ".parcial.mp4");
    const recortar = (entrada) =>
      ejecutarFFmpeg([
        "-y",
        "-ss", String(recorte),
        ...(entrada.startsWith("http") ? ["-user_agent", "EstudioLatitud/0.2"] : []),
        "-i", entrada,
        "-t", String(largo),
        "-an",
        ...CODIFICACION,
        "-crf", "18",
        temporal,
      ]);
    try {
      await recortar(sel.archivo);
    } catch {
      // Plan B: descargar el video completo y recortarlo en local.
      const completo = path.join(bruto, `${escena.id}-${huella(sel.archivo)}-completo${extension(sel.archivo, ".mp4")}`);
      if (!(await existe(completo))) await descargar(sel.archivo, completo);
      await recortar(completo);
    }
    await fs.rename(temporal, destino);
  }
  return { tipo: "video", ruta: destino, recorte: 0 };
}

async function crearClip(fuente, escena, indice, cuadros, destino) {
  const segundos = (cuadros / FPS).toFixed(3);

  if (!fuente) {
    // Escena sin recurso: pantalla oscura con una franja ámbar para que se note en la revisión.
    await ejecutarFFmpeg([
      "-y",
      "-f", "lavfi",
      "-i", `color=c=0x111418:s=${ANCHO}x${ALTO}:r=${FPS}:d=${segundos}`,
      "-vf", `drawbox=x=0:y=ih-14:w=iw:h=14:color=0xD9A441:t=fill${filtroTransicion(escena)}`,
      "-frames:v", String(cuadros),
      ...CODIFICACION,
      destino,
    ]);
    return;
  }

  const info = await inspeccionar(fuente.ruta);

  if (fuente.tipo === "foto") {
    const movimiento =
      !escena.movimiento || escena.movimiento === "auto"
        ? MOVIMIENTOS[indice % MOVIMIENTOS.length]
        : escena.movimiento;
    // Se compone a 4K antes del zoom para que el movimiento sea suave (sin temblor).
    const filtro =
      `[0:v]${filtroComponer(3840, 2160, info.ancho, info.alto)},` +
      `${filtroKenBurns(movimiento, cuadros)},format=yuv420p${filtroTransicion(escena)}[v]`;
    await ejecutarFFmpeg([
      "-y",
      "-i", fuente.ruta,
      "-filter_complex", filtro,
      "-map", "[v]",
      "-frames:v", String(cuadros),
      ...CODIFICACION,
      destino,
    ]);
    return;
  }

  // Video: si es más corto que la escena, se repite en bucle.
  const filtro =
    `[0:v]${filtroComponer(ANCHO, ALTO, info.ancho, info.alto)},fps=${FPS},format=yuv420p${filtroTransicion(escena)}[v]`;
  await ejecutarFFmpeg([
    "-y",
    "-stream_loop", "-1",
    ...(fuente.recorte ? ["-ss", String(fuente.recorte)] : []),
    "-i", fuente.ruta,
    "-filter_complex", filtro,
    "-map", "[v]",
    "-an",
    "-frames:v", String(cuadros),
    ...CODIFICACION,
    destino,
  ]);
}

// ---------- Render completo ----------

export async function renderizarProyecto(id) {
  const proyecto = await leerProyecto(id);
  const escenas = proyecto.escenas || [];
  const registro = [];
  const estado = (datos) => escribirEstado(id, { estado: "trabajando", registro, ...datos });

  try {
    if (!escenas.length) throw new Error("El proyecto no tiene escenas.");
    await estado({ paso: "Preparando", progreso: 0 });

    const carpetaClips = await asegurarCarpeta(rutaDentro(id, "clips"));
    const carpetaCache = await asegurarCarpeta(rutaDentro(id, "bruto", "cache"));
    const carpetaSalida = await asegurarCarpeta(rutaDentro(id, "salida"));
    for (const viejo of await fs.readdir(carpetaClips)) {
      if (/^\d{3}_.*\.mp4$/.test(viejo)) await fs.unlink(path.join(carpetaClips, viejo));
    }

    // Cortes en cuadros exactos para que el video dure lo mismo que la narración.
    const cuadroInicio = escenas.map((e) => Math.round(inicioEscena(e) * FPS));
    const ultima = escenas[escenas.length - 1];
    const cuadroFinal = Math.round((inicioEscena(ultima) + duracionEscena(ultima)) * FPS);

    const sinRecurso = [];
    const nombres = [];
    for (let i = 0; i < escenas.length; i++) {
      const escena = escenas[i];
      const cuadros = Math.max(1, (cuadroInicio[i + 1] ?? cuadroFinal) - cuadroInicio[i]);
      await estado({
        paso: `Escena ${i + 1} de ${escenas.length}`,
        progreso: (i / escenas.length) * 0.85,
      });

      let fuente = null;
      try {
        fuente = await prepararFuente(id, escena, cuadros / FPS);
      } catch (error) {
        registro.push(`Escena ${i + 1}: no se pudo obtener el recurso (${error.message}). Se usará pantalla oscura.`);
      }
      if (!fuente) sinRecurso.push(i + 1);

      const clave = huella(
        fuente?.ruta || "vacia",
        fuente?.recorte || 0,
        cuadros,
        escena.movimiento || "auto",
        escena.transicion || "corte",
        i % MOVIMIENTOS.length
      );
      const enCache = path.join(carpetaCache, `${clave}.mp4`);
      if (!(await existe(enCache))) {
        await crearClip(fuente, escena, i, cuadros, `${enCache}.tmp.mp4`);
        await fs.rename(`${enCache}.tmp.mp4`, enCache);
      }
      const nombre = `${String(i + 1).padStart(3, "0")}_${escena.id}.mp4`;
      await fs.copyFile(enCache, path.join(carpetaClips, nombre));
      nombres.push(nombre);
    }
    if (sinRecurso.length) {
      registro.push(`Escenas sin recurso (pantalla oscura): ${sinRecurso.join(", ")}.`);
    }

    // Unir clips sin recodificar (todos tienen el mismo formato).
    await estado({ paso: "Uniendo escenas", progreso: 0.87 });
    const lista = path.join(carpetaClips, "lista.txt");
    await fs.writeFile(lista, nombres.map((n) => `file '${n}'`).join("\n"));
    const mudo = rutaDentro(id, "bruto", "video_mudo.mp4");
    await ejecutarFFmpeg(["-y", "-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", mudo]);

    // Mezcla final: narración + música.
    await estado({ paso: "Mezclando audio", progreso: 0.92 });
    const total = cuadroFinal / FPS;
    const salida = path.join(carpetaSalida, `${id}.mp4`);
    const args = ["-y", "-i", mudo];
    const narracion = proyecto.narracion?.ruta ? rutaDentro(id, proyecto.narracion.ruta) : null;
    const musica = proyecto.musica?.ruta ? rutaDentro(id, proyecto.musica.ruta) : null;
    if (narracion) args.push("-i", narracion);
    if (musica) args.push("-stream_loop", "-1", "-i", musica);

    const volumen = Math.min(1, Math.max(0, Number(proyecto.musica?.volumen ?? 0.12)));
    const finMusica = Math.max(0, total - 3).toFixed(2);
    if (narracion && musica) {
      args.push(
        "-filter_complex",
        `[2:a]volume=${volumen},afade=t=in:st=0:d=1.5,afade=t=out:st=${finMusica}:d=3[m];` +
          `[1:a][m]amix=inputs=2:duration=longest:normalize=0[a]`,
        "-map", "0:v", "-map", "[a]"
      );
    } else if (narracion) {
      args.push("-map", "0:v", "-map", "1:a");
    } else if (musica) {
      args.push(
        "-filter_complex",
        `[1:a]volume=${Math.max(volumen, 0.5)},afade=t=out:st=${finMusica}:d=3[a]`,
        "-map", "0:v", "-map", "[a]"
      );
    } else {
      args.push("-map", "0:v");
    }
    args.push("-c:v", "copy");
    if (narracion || musica) args.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000");
    args.push("-t", total.toFixed(3), "-movflags", "+faststart", salida);
    let ultimoAviso = 0;
    await ejecutarFFmpeg(args, {
      alProgreso: (t) => {
        if (Date.now() - ultimoAviso < 1000) return;
        ultimoAviso = Date.now();
        estado({ paso: "Mezclando audio", progreso: 0.92 + 0.07 * Math.min(1, t / total) });
      },
    });

    // Textos para publicar y carpeta lista para Filmora.
    const srt = generarSRT(escenas);
    const capitulos = generarCapitulos(escenas);
    const creditos = generarCreditos(escenas);
    await fs.writeFile(path.join(carpetaSalida, "subtitulos.srt"), srt, "utf8");
    await fs.writeFile(path.join(carpetaSalida, "capitulos.txt"), capitulos.texto, "utf8");
    await fs.writeFile(path.join(carpetaSalida, "creditos.txt"), creditos, "utf8");
    await fs.writeFile(path.join(carpetaClips, "subtitulos.srt"), srt, "utf8");
    if (narracion) {
      await fs.copyFile(narracion, path.join(carpetaClips, `narracion${path.extname(narracion)}`));
    }
    await fs.unlink(lista).catch(() => {});

    await escribirEstado(id, {
      estado: "listo",
      paso: "Listo",
      progreso: 1,
      registro,
      salida: rutaRelativa(id, salida),
      duracion: total,
      terminado: Date.now(),
    });
  } catch (error) {
    console.error(error);
    await escribirEstado(id, {
      estado: "error",
      paso: "Error",
      progreso: 0,
      registro,
      mensaje: error.message,
    });
  }
}
