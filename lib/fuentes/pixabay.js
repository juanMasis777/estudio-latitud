// Pixabay API: https://pixabay.com/api/docs/
// Límite: 100 solicitudes por minuto. Piden mostrar de dónde vienen los resultados.
// Las URLs de imágenes no se pueden enlazar de forma permanente:
// en la Fase 2 la app descargará los archivos a tu PC.

const BASE = "https://pixabay.com/api";

function clave() {
  if (!process.env.PIXABAY_API_KEY) {
    throw new Error("Falta PIXABAY_API_KEY en .env.local");
  }
  return process.env.PIXABAY_API_KEY;
}

function parametros(consulta, cantidad) {
  return new URLSearchParams({
    key: clave(),
    q: consulta.slice(0, 100),
    per_page: String(Math.max(3, cantidad)),
    safesearch: "true",
    lang: "en",
  });
}

export async function buscarVideosPixabay(consulta, cantidad = 12) {
  const params = parametros(consulta, cantidad);
  params.set("video_type", "film");
  params.set("min_width", "1280");

  const res = await fetch(`${BASE}/videos/?${params}`);
  if (!res.ok) throw new Error(`Pixabay videos respondió ${res.status}`);
  const datos = await res.json();

  return (datos.hits || [])
    .map((v) => {
      // "medium" suele ser 1920×1080 y existe en todos los videos.
      const archivo = v.videos?.medium?.url ? v.videos.medium : v.videos?.small;
      if (!archivo?.url) return null;
      return {
        id: `pixabay-video-${v.id}`,
        fuente: "Pixabay",
        tipo: "video",
        miniatura: archivo.thumbnail || v.videos?.tiny?.thumbnail,
        archivo: archivo.url,
        ancho: archivo.width,
        alto: archivo.height,
        duracion: v.duration,
        pagina: v.pageURL,
        descripcion: v.tags || "",
        autor: v.user || "Desconocido",
        autor_url: null,
        licencia: "Licencia de Pixabay",
        licencia_url: "https://pixabay.com/service/license-summary/",
        credito: `Video de ${v.user || "autor desconocido"} en Pixabay — ${v.pageURL}`,
      };
    })
    .filter(Boolean);
}

export async function buscarFotosPixabay(consulta, cantidad = 12) {
  const params = parametros(consulta, cantidad);
  params.set("image_type", "photo");
  params.set("orientation", "horizontal");
  params.set("min_width", "1280");

  const res = await fetch(`${BASE}/?${params}`);
  if (!res.ok) throw new Error(`Pixabay fotos respondió ${res.status}`);
  const datos = await res.json();

  return (datos.hits || []).map((f) => ({
    id: `pixabay-foto-${f.id}`,
    fuente: "Pixabay",
    tipo: "foto",
    miniatura: f.webformatURL,
    // largeImageURL llega hasta 1280 px sin acceso completo aprobado.
    archivo: f.largeImageURL,
    ancho: f.imageWidth,
    alto: f.imageHeight,
    duracion: null,
    pagina: f.pageURL,
    descripcion: f.tags || "",
    autor: f.user || "Desconocido",
    autor_url: null,
    licencia: "Licencia de Pixabay",
    licencia_url: "https://pixabay.com/service/license-summary/",
    credito: `Foto de ${f.user || "autor desconocido"} en Pixabay — ${f.pageURL}`,
  }));
}
