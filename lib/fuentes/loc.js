// Library of Congress (loc.gov) JSON API: https://www.loc.gov/apis/
// Solo se muestran fotos marcadas "No known restrictions" o de dominio público.
// Si la API no indica los derechos, la foto se descarta (mejor no mostrarla que arriesgarse).

const BASE = "https://www.loc.gov/photos/";
const USER_AGENT = "EstudioLatitud/0.2 (herramienta personal de produccion de video)";

function textoDerechos(item) {
  const campos = [item.rights_advisory, item.rights, item.item?.rights_advisory, item.item?.rights];
  return campos
    .flat()
    .filter(Boolean)
    .map((c) => (typeof c === "string" ? c : JSON.stringify(c)))
    .join(" ");
}

function sinRestricciones(texto) {
  const t = texto.toLowerCase();
  return t.includes("no known restrictions") || t.includes("public domain");
}

function limpiarURL(url = "") {
  return url.split("#")[0];
}

async function obtenerJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Library of Congress respondió ${res.status}`);
  return res.json();
}

export async function buscarLoc(consulta, cantidad = 20) {
  const params = new URLSearchParams({
    q: consulta,
    fo: "json",
    c: String(cantidad),
    fa: "online-format:image",
  });
  const datos = await obtenerJSON(`${BASE}?${params}`);
  const resultados = (datos.results || []).filter((r) => (r.image_url || []).length > 0);

  // Si la búsqueda no trae los derechos, se consultan en la ficha de cada foto (máx. 10).
  const conDerechos = await Promise.all(
    resultados.slice(0, 10).map(async (r) => {
      let derechos = textoDerechos(r);
      if (!derechos && r.url) {
        try {
          const ficha = await obtenerJSON(`${r.url.replace(/\/$/, "")}/?fo=json`);
          derechos = textoDerechos(ficha);
        } catch {
          derechos = "";
        }
      }
      return { r, derechos };
    })
  );

  return conDerechos
    .filter(({ derechos }) => sinRestricciones(derechos))
    .map(({ r, derechos }) => {
      const imagenes = r.image_url.map(limpiarURL);
      const titulo = Array.isArray(r.title) ? r.title[0] : r.title || "Sin título";
      return {
        id: `loc-${r.id || r.url}`,
        fuente: "Library of Congress",
        tipo: "foto",
        miniatura: imagenes[Math.min(1, imagenes.length - 1)],
        archivo: imagenes[imagenes.length - 1],
        ancho: null,
        alto: null,
        duracion: null,
        pagina: r.url,
        descripcion: titulo.slice(0, 200),
        fecha: r.date || null,
        autor: (r.contributor || [])[0] || "Library of Congress",
        autor_url: null,
        licencia: derechos.toLowerCase().includes("public domain")
          ? "Dominio público"
          : "Sin restricciones conocidas",
        licencia_url: "https://www.loc.gov/legal/understanding-copyright/",
        credito: `${titulo} — Library of Congress — ${r.url}`,
      };
    });
}
