// Wikimedia Commons API (MediaWiki): https://commons.wikimedia.org/w/api.php
// Cada archivo tiene su propia licencia (dominio público, CC BY, CC BY-SA...).
// Guardamos autor y licencia de cada uno para los créditos.

const API = "https://commons.wikimedia.org/w/api.php";

// Wikimedia pide un User-Agent identificable.
const USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT ||
  "EstudioLatitud/0.1 (herramienta personal de produccion de video)";

// Licencias que permiten uso comercial y modificación.
// Se excluyen "NC" (no comercial) y "ND" (sin obras derivadas).
function licenciaPermitida(nombre = "") {
  const n = nombre.toLowerCase();
  if (/(^|[\s-])(nc|nd)([\s-]|$)/.test(n)) return false;
  return (
    n.includes("public domain") ||
    /(^|[\s-])pd([\s-]|$)/.test(n) ||
    n.includes("cc0") ||
    n.includes("cc by") ||
    n.includes("cc-by")
  );
}

function limpiarHTML(texto = "") {
  return texto.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function buscarWikimedia(consulta, cantidad = 15) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${consulta} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(cantidad),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "640",
  });

  const res = await fetch(`${API}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Wikimedia respondió ${res.status}`);
  const datos = await res.json();
  const paginas = Object.values(datos.query?.pages || {});

  return paginas
    .map((p) => {
      const info = p.imageinfo?.[0];
      if (!info || !["image/jpeg", "image/png"].includes(info.mime)) return null;
      const meta = info.extmetadata || {};
      const licencia = meta.LicenseShortName?.value || "";
      if (!licenciaPermitida(licencia)) return null;
      // Descarta imágenes demasiado pequeñas para 1080p.
      if (info.width < 1000) return null;

      const autor = limpiarHTML(meta.Artist?.value) || "Desconocido";
      return {
        id: `wikimedia-${p.pageid}`,
        fuente: "Wikimedia Commons",
        tipo: "foto",
        miniatura: info.thumburl,
        archivo: info.url,
        ancho: info.width,
        alto: info.height,
        duracion: null,
        pagina: info.descriptionurl,
        descripcion: limpiarHTML(meta.ImageDescription?.value).slice(0, 200),
        fecha: limpiarHTML(meta.DateTimeOriginal?.value) || null,
        autor,
        autor_url: null,
        licencia,
        licencia_url: meta.LicenseUrl?.value || null,
        credito: `${p.title.replace("File:", "")} — ${autor} — ${licencia} — vía Wikimedia Commons — ${info.descriptionurl}`,
      };
    })
    .filter(Boolean);
}
