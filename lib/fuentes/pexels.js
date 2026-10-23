// Pexels API: https://www.pexels.com/api/documentation/
// Límite por defecto: 200 solicitudes/hora y 20,000/mes.
// Requisito: mostrar un enlace visible a Pexels y acreditar al autor cuando sea posible.

const BASE = "https://api.pexels.com";

function cabeceras() {
  if (!process.env.PEXELS_API_KEY) {
    throw new Error("Falta PEXELS_API_KEY en .env.local");
  }
  return { Authorization: process.env.PEXELS_API_KEY };
}

// Elige el archivo de video más cercano a 1080p sin pasarse de 4K.
function mejorArchivo(archivos) {
  const mp4 = archivos.filter((a) => a.file_type === "video/mp4" && a.width);
  if (mp4.length === 0) return null;
  const ordenados = [...mp4].sort(
    (a, b) => Math.abs(a.height - 1080) - Math.abs(b.height - 1080)
  );
  return ordenados[0];
}

export async function buscarVideosPexels(consulta, cantidad = 12) {
  const url = `${BASE}/videos/search?query=${encodeURIComponent(
    consulta
  )}&per_page=${cantidad}&orientation=landscape&size=medium`;
  const res = await fetch(url, { headers: cabeceras() });
  if (!res.ok) throw new Error(`Pexels videos respondió ${res.status}`);
  const datos = await res.json();

  return (datos.videos || [])
    .map((v) => {
      const archivo = mejorArchivo(v.video_files || []);
      if (!archivo) return null;
      return {
        id: `pexels-video-${v.id}`,
        fuente: "Pexels",
        tipo: "video",
        miniatura: v.image,
        archivo: archivo.link,
        ancho: archivo.width,
        alto: archivo.height,
        duracion: v.duration,
        pagina: v.url,
        autor: v.user?.name || "Desconocido",
        autor_url: v.user?.url || null,
        licencia: "Licencia de Pexels",
        licencia_url: "https://www.pexels.com/license/",
        credito: `Video de ${v.user?.name || "autor desconocido"} en Pexels — ${v.url}`,
      };
    })
    .filter(Boolean);
}

export async function buscarFotosPexels(consulta, cantidad = 12) {
  const url = `${BASE}/v1/search?query=${encodeURIComponent(
    consulta
  )}&per_page=${cantidad}&orientation=landscape`;
  const res = await fetch(url, { headers: cabeceras() });
  if (!res.ok) throw new Error(`Pexels fotos respondió ${res.status}`);
  const datos = await res.json();

  return (datos.photos || []).map((f) => ({
    id: `pexels-foto-${f.id}`,
    fuente: "Pexels",
    tipo: "foto",
    miniatura: f.src?.medium,
    archivo: f.src?.original,
    ancho: f.width,
    alto: f.height,
    duracion: null,
    pagina: f.url,
    descripcion: f.alt || "",
    autor: f.photographer || "Desconocido",
    autor_url: f.photographer_url || null,
    licencia: "Licencia de Pexels",
    licencia_url: "https://www.pexels.com/license/",
    credito: `Foto de ${f.photographer || "autor desconocido"} en Pexels — ${f.url}`,
  }));
}
