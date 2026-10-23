import Anthropic from "@anthropic-ai/sdk";

const MODELO = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

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

Responde ÚNICAMENTE con JSON válido, sin texto adicional, con esta forma:
{"escenas":[{"narracion":"...","consultas":["...","...","..."],"tipo":"historica","personas_sensibles":false,"nota_visual":"..."}]}`;

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
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
  }

  const cliente = new Anthropic();
  const respuesta = await cliente.messages.create({
    model: MODELO,
    max_tokens: 16000,
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: guion }],
  });

  const texto = respuesta.content
    .filter((bloque) => bloque.type === "text")
    .map((bloque) => bloque.text)
    .join("");

  const datos = extraerJSON(texto);
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
      seleccion: null,
      necesita_ia: false,
    };
    inicio += duracion;
    return resultado;
  });
}
