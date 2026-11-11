import { duracionEscena, inicioEscena } from "./alineacion.js";

function dosDigitos(n) {
  return String(n).padStart(2, "0");
}

function tiempoSRT(segundos) {
  const ms = Math.max(0, Math.round(segundos * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${dosDigitos(h)}:${dosDigitos(m)}:${dosDigitos(s)},${String(ms % 1000).padStart(3, "0")}`;
}

export function tiempoCapitulo(segundos) {
  const total = Math.floor(segundos);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${dosDigitos(m)}:${dosDigitos(s)}` : `${m}:${dosDigitos(s)}`;
}

// Divide la narración de una escena en frases cortas para subtítulos.
function trozosSubtitulo(texto) {
  const frases = texto
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.?!;:…])\s+/)
    .filter(Boolean);
  const trozos = [];
  for (const frase of frases) {
    const palabras = frase.split(" ");
    if (palabras.length <= 12) {
      trozos.push(frase);
      continue;
    }
    const partes = Math.ceil(palabras.length / 10);
    const porParte = Math.ceil(palabras.length / partes);
    for (let i = 0; i < palabras.length; i += porParte) {
      trozos.push(palabras.slice(i, i + porParte).join(" "));
    }
  }
  return trozos;
}

export function generarSRT(escenas) {
  const lineas = [];
  let n = 1;
  for (const escena of escenas) {
    const trozos = trozosSubtitulo(escena.narracion || "");
    if (!trozos.length) continue;
    const inicio = inicioEscena(escena);
    const duracion = duracionEscena(escena);
    const caracteres = trozos.reduce((s, t) => s + t.length, 0);
    let t = inicio;
    for (const trozo of trozos) {
      const d = (duracion * trozo.length) / caracteres;
      lineas.push(`${n++}\n${tiempoSRT(t)} --> ${tiempoSRT(t + d - 0.05)}\n${trozo}\n`);
      t += d;
    }
  }
  return lineas.join("\n");
}

// Capítulos de YouTube: el primero en 0:00, al menos 3 y separados 10 s o más.
export function generarCapitulos(escenas) {
  const capitulos = [];
  for (const escena of escenas) {
    if (!escena.capitulo) continue;
    const inicio = capitulos.length === 0 ? 0 : inicioEscena(escena);
    const previo = capitulos[capitulos.length - 1];
    if (previo && inicio - previo.inicio < 10) continue;
    capitulos.push({ inicio, titulo: escena.capitulo });
  }
  if (capitulos.length === 0 && escenas.length) {
    capitulos.push({ inicio: 0, titulo: "Introducción" });
  }
  const texto = capitulos.map((c) => `${tiempoCapitulo(c.inicio)} ${c.titulo}`).join("\n");
  return {
    texto,
    valido: capitulos.length >= 3,
    aviso:
      capitulos.length >= 3
        ? null
        : "YouTube necesita al menos 3 capítulos. Agrega títulos de sección a tu guion ([ESCENA 3 — TÍTULO]).",
  };
}

export function generarCreditos(escenas) {
  const unicos = new Map();
  let usaIA = false;
  for (const e of escenas) {
    if (e.archivo_propio) {
      if (e.archivo_propio.es_ia) usaIA = true;
      continue;
    }
    if (e.seleccion) unicos.set(e.seleccion.id, e.seleccion.credito);
  }
  const lineas = [];
  if (unicos.size) lineas.push("Imágenes y videos:", ...[...unicos.values()].map((c) => `• ${c}`));
  if (usaIA) lineas.push("", "Algunas imágenes son recreaciones generadas con IA.");
  return lineas.length ? lineas.join("\n") : "Aún no has elegido recursos.";
}
