import { promises as fs } from "fs";
import path from "path";

// Los proyectos se guardan como JSON en la carpeta /proyectos del repo
// (ignorada por git). Cada video = un archivo.
const CARPETA = path.join(process.cwd(), "proyectos");

function rutaSegura(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("ID de proyecto inválido");
  return path.join(CARPETA, `${id}.json`);
}

export function crearId(titulo) {
  const base = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return base || `proyecto-${Date.now()}`;
}

export async function guardarProyecto(proyecto) {
  await fs.mkdir(CARPETA, { recursive: true });
  const datos = { ...proyecto, actualizado: new Date().toISOString() };
  await fs.writeFile(rutaSegura(proyecto.id), JSON.stringify(datos, null, 2), "utf8");
  return datos;
}

export async function leerProyecto(id) {
  const texto = await fs.readFile(rutaSegura(id), "utf8");
  return JSON.parse(texto);
}

export async function listarProyectos() {
  try {
    const archivos = await fs.readdir(CARPETA);
    const proyectos = await Promise.all(
      archivos
        .filter((a) => a.endsWith(".json"))
        .map(async (a) => {
          const p = JSON.parse(await fs.readFile(path.join(CARPETA, a), "utf8"));
          return {
            id: p.id,
            titulo: p.titulo,
            escenas: p.escenas?.length || 0,
            actualizado: p.actualizado,
          };
        })
    );
    return proyectos.sort((a, b) => (b.actualizado || "").localeCompare(a.actualizado || ""));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
