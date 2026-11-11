import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { rutaDentro } from "@/lib/medios";

const TIPOS = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".srt": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// Sirve archivos de /medios/<id>/ con soporte de rangos (para adelantar el video en el reproductor).
export async function GET(request, { params }) {
  try {
    const { id, ruta } = await params;
    const archivo = rutaDentro(id, ...ruta);
    const info = await fs.stat(archivo);
    if (!info.isFile()) return new Response("No encontrado", { status: 404 });

    const cabeceras = {
      "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    };
    if (request.nextUrl.searchParams.get("descargar")) {
      cabeceras["Content-Disposition"] = `attachment; filename="${path.basename(archivo)}"`;
    }

    const rango = request.headers.get("range");
    const m = rango?.match(/bytes=(\d*)-(\d*)/);
    if (m && (m[1] || m[2])) {
      const inicio = m[1] ? Number(m[1]) : Math.max(0, info.size - Number(m[2]));
      const fin = m[1] && m[2] ? Math.min(Number(m[2]), info.size - 1) : info.size - 1;
      if (inicio >= info.size || inicio > fin) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      }
      return new Response(Readable.toWeb(createReadStream(archivo, { start: inicio, end: fin })), {
        status: 206,
        headers: {
          ...cabeceras,
          "Content-Range": `bytes ${inicio}-${fin}/${info.size}`,
          "Content-Length": String(fin - inicio + 1),
        },
      });
    }

    return new Response(Readable.toWeb(createReadStream(archivo)), {
      headers: { ...cabeceras, "Content-Length": String(info.size) },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
