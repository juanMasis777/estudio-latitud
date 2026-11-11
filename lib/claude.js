import Anthropic from "@anthropic-ai/sdk";

const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

// Sufijo de estilo fijo del canal (guía de producción). Se puede cambiar con ESTILO_IA en .env.local.
export const ESTILO_IA =
  process.env.ESTILO_IA ||
  "cinematic documentary still, muted desaturated cold tones with subtle sepia, soft volumetric light, fine film grain, photorealistic, 16:9, no text, no logos, no watermark";

// Narración en español a ritmo documental: ~2.5 palabras por segundo (~150 ppm).
// Es una estimación; la duración real se ajustará con tu audio en la Fase 2.
const PALABRAS_POR_SEGUNDO = 2.5;

const INSTRUCCIONES = `Eres el asistente de producción del canal de YouTube "Latitud Oscura" (historias reales de lugares oscuros o misteriosos, narradas en español).

Recibirás un guion. Divídelo en escenas visuales para el montaje.

Reglas:
- Usa SOLO el texto de narración. Ignora indicaciones de edición, notas, títulos de sección, marcas de tiempo y acotaciones (normalmente entre corchetes, paréntesis o etiquetadas como EDICIÓN / VISUAL / NOTA), pero úsalas como pista para elegir el recurso visual.
- Copia la narración de cada escena TEXTUALMENTE, sin resumir ni reescribir.
- Cada escena debe durar entre 5 y 15 segundos de narración (aprox. 12 a 38 palabras). Corta en pausas naturales.
- Para cada escena da 3 consultas de búsqueda EN INGLÉS, concretas y visuales. Ordénalas de más específica a más genérica.
  - En escenas "historica", la primera consulta debe ser MUY corta (1 o 2 palabras): el nombre propio del lugar, la persona o el objeto tal como aparecería en el título de un archivo de Wikimedia Commons (ej. "Fordlandia", "Henry Ford", "Tapajós River"). No añadas años ni verbos. La segunda puede combinar ese nombre con un sustantivo (ej. "Fordlandia houses").
  - La tercera consulta es siempre genérica (2 a 3 palabras), sin nombres propios, para bancos de video como Pixabay (ej. "jungle river aerial", "old steamship").
- "tipo" es "historica" si la escena describe personas, hechos o lugares concretos del pasado (mejor una foto de archivo real), o "ambiente" si basta con un plano genérico (selva, mar, ruinas, niebla, etc.).
- "personas_sensibles" es true si la escena trata de muerte, crimen, enfermedad, violencia o víctimas. En ese caso las consultas deben buscar lugares, objetos o paisajes, NUNCA personas.
- "nota_visual": una frase breve en español con la idea visual de la escena.
- "capitulo": si la escena ABRE una nueva sección del guion (por ejemplo, tras una marca como [ESCENA 3 — POR QUÉ LA AMAZONÍA]), un título de capítulo corto en español (2 a 5 palabras) basado en esa sección. La primera escena siempre lleva capitulo. Si la escena continúa la sección anterior, usa null.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta forma:
{"escenas":[{"narracion":"...","consultas":["...","...","..."],"tipo":"historica","personas_sensibles":false,"nota_visual":"...","capitulo":"El sueño de Ford"}]}`;

function cliente() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
  }
  return new Anthropic();
}

function textoDe(respuesta) {
  return respuesta.content
    .filter((bloque) => bloque.type === "text")
    .map((bloque) => bloque.text)
    .join("");
}

function extraerJSON(texto) {
  const inicio = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  if (inicio === -1 || fin === -1) {
    throw new Error("La respuesta de Claude no contiene JSON.");
  }
  return JSON.parse(texto.slice(inicio, fin + 1));
}

function contarPalabras(texto) {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export async function dividirEnEscenas(guion) {
  const respuesta = await cliente().messages.create({
    model: MODELO,
    max_tokens: 16000,
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: guion }],
  });

  const datos = extraerJSON(textoDe(respuesta));
  if (!Array.isArray(datos.escenas) || datos.escenas.length === 0) {
    throw new Error("Claude no devolvió escenas.");
  }

  let inicio = 0;
  return datos.escenas.map((escena, i) => {
    const palabras = contarPalabras(escena.narracion || "");
    const duracion = Math.max(3, Math.round(palabras / PALABRAS_POR_SEGUNDO));
    const resultado = {
      id: `e${String(i + 1).padStart(3, "0")}`,
      numero: i + 1,
      narracion: escena.narracion || "",
      palabras,
      duracion_estimada: duracion,
      inicio_estimado: inicio,
      consultas: Array.isArray(escena.consultas) ? escena.consultas.slice(0, 3) : [],
      tipo: escena.tipo === "historica" ? "historica" : "ambiente",
      personas_sensibles: Boolean(escena.personas_sensibles),
      nota_visual: escena.nota_visual || "",
      capitulo: typeof escena.capitulo === "string" && escena.capitulo.trim() ? escena.capitulo.trim() : i === 0 ? "Introducción" : null,
      seleccion: null,
      necesita_ia: false,
    };
    inicio += duracion;
    return resultado;
  });
}

const INSTRUCCIONES_PROMPT = `Escribes prompts para generar imágenes fijas de un documental de YouTube (canal "Latitud Oscura": historias reales de lugares oscuros o misteriosos).

Reglas:
- Un solo prompt, en inglés, de 40 a 70 palabras, describiendo una escena concreta y visual: lugar, época, luz, encuadre.
- Nunca muestres caras reconocibles de personas reales ni recrees a personas reales identificables. Si hay personas, que aparezcan de espaldas, lejos o en silueta.
- Si la escena trata de muerte, violencia, crimen o víctimas, muestra el lugar o los objetos, nunca cuerpos, heridas ni sufrimiento.
- Sin texto, logos ni marcas de agua.
- No incluyas el estilo general (se añade aparte).
Responde solo con el prompt, sin comillas ni explicaciones.`;

export async function generarPromptIA({ titulo, narracion, nota_visual }) {
  const respuesta = await cliente().messages.create({
    model: MODELO,
    max_tokens: 400,
    system: INSTRUCCIONES_PROMPT,
    messages: [
      {
        role: "user",
        content: `Video: ${titulo || "sin título"}\nNarración de la escena: ${narracion}\nIdea visual: ${nota_visual || "—"}`,
      },
    ],
  });
  const base = textoDe(respuesta).trim().replace(/^"|"$/g, "").replace(/[.\s]+$/, "");
  return `${base}, ${ESTILO_IA}`;
}
