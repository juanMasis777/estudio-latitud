// Internet Archive: películas antiguas con licencia indicada.
// Solo se aceptan dominio público, CC0, CC BY y CC BY-SA (sin NC ni ND).
// La app recorta solo el tramo que necesitas, sin descargar la película entera.

const BUSQUEDA = "https://archive.org/advancedsearch.php";
const METADATOS = "https://archive.org/metadata/";

// La búsqueda trae dominio público y Creative Commons; las NC y ND se descartan en licenciaLegible().
// Ojo: en Internet Archive la licencia la declara quien sube el archivo. Revisa la página antes de publicar.
const FILTRO_LICENCIA = "(licenseurl:*publicdomain* OR licenseurl:*creativecommons*)";

function licenciaLegible(url = "") {
  const u = url.toLowerCase();
  if (u.includes("publicdomain/mark")) return "Dominio público";
  if (u.includes("publicdomain/zero") || u.includes("cc0")) return "CC0";
  if (u.includes("-nc") || u.includes("-nd")) return null;
  if (u.includes("/by-sa/")) return "CC BY-SA";
  if (u.includes("/by/")) return "CC BY";
  return null;
}

// Elige el MP4 de mayor resolución de la ficha.
function mejorVideo(archivos = []) {
  const mp4 = archivos.filter(
    (a) => /\.mp4$/i.test(a.name) && !/thumb/i.test(a.name) && (a.format || "").match(/mpeg4|h\.264/i)
  );
  if (!mp4.length) return null;
  return mp4.sort((a, b) => Number(b.height || 0) - Number(a.height || 0))[0];
}

export async function buscarArchive(consulta, cantidad = 8) {
  const params = new URLSearchParams();
  params.set("q", `(${consulta}) AND mediatype:movies AND ${FILTRO_LICENCIA}`);
  for (const campo of ["identifier", "title", "licenseurl", "year", "creator"]) {
    params.append("fl[]", campo);
  }
  params.set("rows", String(cantidad));
  params.set("output", "json");

  const res = await fetch(`${BUSQUEDA}?${params}`);
  if (!res.ok) throw new Error(`Internet Archive respondió ${res.status}`);
  const datos = await res.json();
  const docs = datos.response?.docs || [];

  const resultados = await Promise.all(
    docs.map(async (doc) => {
      const licencia = licenciaLegible(doc.licenseurl);
      if (!licencia) return null;
      try {
        const ficha = await (await fetch(`${METADATOS}${encodeURIComponent(doc.identifier)}`)).json();
        const video = mejorVideo(ficha.files);
        if (!video) return null;
        const titulo = Array.isArray(doc.title) ? doc.title[0] : doc.title || doc.identifier;
        const autor = (Array.isArray(doc.creator) ? doc.creator[0] : doc.creator) || "Internet Archive";
        const pagina = `https://archive.org/details/${doc.identifier}`;
        return {
          id: `archive-${doc.identifier}`,
          fuente: "Internet Archive",
          tipo: "video",
          miniatura: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
          archivo: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${video.name
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
          ancho: Number(video.width) || null,
          alto: Number(video.height) || null,
          duracion: video.length ? Math.round(Number(video.length)) : null,
          pagina,
          descripcion: titulo.slice(0, 200),
          fecha: doc.year || null,
          autor,
          autor_url: null,
          licencia,
          licencia_url: doc.licenseurl,
          credito: `${titulo} — ${autor} — ${licencia} — vía Internet Archive — ${pagina}`,
        };
      } catch {
        return null;
      }
    })
  );
  return resultados.filter(Boolean);
}
