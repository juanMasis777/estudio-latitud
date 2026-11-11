import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { leerProyecto, guardarProyecto } from "@/lib/proyectos";
import {
  asegurarCarpeta,
  extension,
  guardarSubida,
  huella,
  rutaDentro,
  rutaRelativa,
} from "@/lib/medios";
import { detectarSilencios, inspeccionar } from "@/lib/ffmpeg";
import { alinearEscenas } from "@/lib/alineacion";

const IMAGEN = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO = [".mp4", ".mov", ".webm", ".mkv", ".m4v"];
const AUDIO = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];

function error(mensaje, estado = 400) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

// Sube un archivo: imagen o video propio de una escena, narración o música.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const proyecto = await leerProyecto(id);
    const datos = await request.formData();
    const tipo = datos.get("tipo");
    const archivo = datos.get("archivo");
    if (!archivo || typeof archivo === "string") return error("No llegó ningún archivo.");
    const ext = extension(archivo.name);

    if (tipo === "escena") {
      const escenaId = String(datos.get("escenaId") || "");
      const escena = proyecto.escenas.find((e) => e.id === escenaId);
      if (!escena) return error("Escena no encontrada.", 404);
      const esImagen = IMAGEN.includes(ext);
      if (!esImagen && !VIDEO.includes(ext)) {
        return error("Formato no admitido. Usa JPG, PNG, WEBP, MP4, MOV o WEBM.");
      }
      const carpeta = await asegurarCarpeta(rutaDentro(id, "propios"));
      const destino = path.join(carpeta, `${escenaId}-${huella(archivo.name, archivo.size, Date.now())}${ext}`);
      await guardarSubida(archivo, destino);
      const info = await inspeccionar(destino);
      escena.archivo_propio = {
        ruta: rutaRelativa(id, destino),
        nombre: archivo.name,
        tipo: esImagen ? "foto" : "video",
        es_ia: datos.get("es_ia") === "true",
        ancho: info.ancho,
        alto: info.alto,
        duracion: info.duracion,
      };
      escena.necesita_ia = false;
    } else if (tipo === "narracion") {
      if (!AUDIO.includes(ext)) return error("Formato de audio no admitido. Usa MP3, WAV, M4A, AAC, OGG o FLAC.");
      const carpeta = await asegurarCarpeta(rutaDentro(id, "narracion"));
      for (const viejo of await fs.readdir(carpeta)) await fs.unlink(path.join(carpeta, viejo));
      const destino = path.join(carpeta, `narracion${ext}`);
      await guardarSubida(archivo, destino);
      const info = await inspeccionar(destino);
      if (!info.duracion || !info.tieneAudio) return error("No se pudo leer el audio.");
      const silencios = await detectarSilencios(destino);
      proyecto.escenas = alinearEscenas(proyecto.escenas, info.duracion, silencios);
      proyecto.narracion = {
        ruta: rutaRelativa(id, destino),
        nombre: archivo.name,
        duracion: info.duracion,
        pausas: silencios.length,
        alineada: new Date().toISOString(),
      };
    } else if (tipo === "musica") {
      if (!AUDIO.includes(ext)) return error("Formato de audio no admitido.");
      const carpeta = await asegurarCarpeta(rutaDentro(id, "musica"));
      for (const viejo of await fs.readdir(carpeta)) await fs.unlink(path.join(carpeta, viejo));
      const destino = path.join(carpeta, `musica${ext}`);
      await guardarSubida(archivo, destino);
      proyecto.musica = {
        ruta: rutaRelativa(id, destino),
        nombre: archivo.name,
        volumen: proyecto.musica?.volumen ?? 0.12,
      };
    } else {
      return error("Tipo de archivo desconocido.");
    }

    return NextResponse.json(await guardarProyecto(proyecto));
  } catch (e) {
    console.error(e);
    return error(e.message, 500);
  }
}

// Quita un archivo subido (?tipo=narracion|musica|escena&escenaId=e001).
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const proyecto = await leerProyecto(id);
    const tipo = request.nextUrl.searchParams.get("tipo");
    if (tipo === "narracion") {
      delete proyecto.narracion;
      proyecto.escenas = proyecto.escenas.map((e) => {
        const copia = { ...e };
        delete copia.inicio_real;
        delete copia.duracion_real;
        return copia;
      });
    } else if (tipo === "musica") {
      delete proyecto.musica;
    } else if (tipo === "escena") {
      const escena = proyecto.escenas.find((e) => e.id === request.nextUrl.searchParams.get("escenaId"));
      if (escena) delete escena.archivo_propio;
    } else {
      return error("Tipo desconocido.");
    }
    return NextResponse.json(await guardarProyecto(proyecto));
  } catch (e) {
    return error(e.message, 500);
  }
}
