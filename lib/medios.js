import { promises as fs, createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import crypto from "crypto";

// Cada proyecto guarda sus archivos en /medios/<id>/ (ignorada por git).
export const RAIZ_MEDIOS = path.join(process.cwd(), "medios");

export function carpetaProyecto(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("ID de proyecto inválido");
  return path.join(RAIZ_MEDIOS, id);
}

// Une rutas sin permitir salir de la carpeta del proyecto.
export function rutaDentro(id, ...partes) {
  const base = carpetaProyecto(id);
  const ruta = path.resolve(base, ...partes);
  if (ruta !== base && !ruta.startsWith(base + path.sep)) {
    throw new Error("Ruta fuera del proyecto");
  }
  return ruta;
}

export async function asegurarCarpeta(ruta) {
  await fs.mkdir(ruta, { recursive: true });
  return ruta;
}

export async function existe(ruta) {
  try {
    await fs.access(ruta);
    return true;
  } catch {
    return false;
  }
}

export function huella(...valores) {
  return crypto.createHash("sha1").update(valores.join("|")).digest("hex").slice(0, 10);
}

export function extension(nombre, porDefecto = "") {
  const limpio = String(nombre).split("?")[0].split("#")[0];
  const ext = path.extname(limpio).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : porDefecto;
}

const USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT ||
  "EstudioLatitud/0.2 (herramienta personal de produccion de video)";

export async function descargar(url, destino) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok || !res.body) throw new Error(`No se pudo descargar (${res.status}): ${url}`);
  const temporal = `${destino}.parcial`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(temporal));
  await fs.rename(temporal, destino);
  return destino;
}

export async function guardarSubida(archivo, destino) {
  const datos = Buffer.from(await archivo.arrayBuffer());
  await fs.writeFile(destino, datos);
  return destino;
}

export function rutaRelativa(id, rutaAbsoluta) {
  return path.relative(carpetaProyecto(id), rutaAbsoluta).split(path.sep).join("/");
}
