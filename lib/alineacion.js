// Alinea las escenas con la narración grabada sin transcribir:
// 1) reparte la duración hablada en proporción a las palabras de cada escena;
// 2) mueve cada corte a la pausa (silencio) más cercana, porque las escenas
//    se dividieron justo en pausas naturales del guion.

function contarPalabras(texto = "") {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

export function alinearEscenas(escenas, duracionTotal, silencios) {
  if (!escenas.length) return [];
  const palabras = escenas.map((e) => Math.max(1, contarPalabras(e.narracion)));
  const totalPalabras = palabras.reduce((a, b) => a + b, 0);

  // Zona hablada: sin el silencio inicial ni el final.
  let inicioHabla = 0;
  let finHabla = duracionTotal;
  const primero = silencios[0];
  if (primero && primero.inicio < 0.05 && primero.fin) inicioHabla = primero.fin;
  const ultimo = silencios[silencios.length - 1];
  if (ultimo && (ultimo.fin === null || ultimo.fin >= duracionTotal - 0.05)) {
    finHabla = ultimo.inicio;
  }
  if (finHabla - inicioHabla < duracionTotal * 0.5) {
    inicioHabla = 0;
    finHabla = duracionTotal;
  }
  const hablado = finHabla - inicioHabla;

  // Puntos de corte candidatos: centro de cada pausa interna.
  const pausas = silencios
    .filter((s) => s.fin !== null && s.inicio > inicioHabla && s.fin < finHabla)
    .map((s) => (s.inicio + s.fin) / 2);

  const promedio = hablado / escenas.length;
  const ventana = Math.max(1.5, promedio * 0.35);
  const minimo = 1.0;

  const cortes = [];
  let acumulado = 0;
  let anterior = 0;
  for (let i = 0; i < escenas.length - 1; i++) {
    acumulado += palabras[i];
    const objetivo = inicioHabla + (hablado * acumulado) / totalPalabras;
    let mejor = null;
    for (const p of pausas) {
      if (p <= anterior + minimo) continue;
      const distancia = Math.abs(p - objetivo);
      if (distancia <= ventana && (mejor === null || distancia < Math.abs(mejor - objetivo))) {
        mejor = p;
      }
    }
    const corte = Math.max(mejor ?? objetivo, anterior + minimo);
    cortes.push(Math.min(corte, duracionTotal - minimo * (escenas.length - 1 - i)));
    anterior = cortes[cortes.length - 1];
  }

  const limites = [0, ...cortes, duracionTotal];
  return escenas.map((escena, i) => ({
    ...escena,
    inicio_real: redondear(limites[i]),
    duracion_real: redondear(limites[i + 1] - limites[i]),
  }));
}

function redondear(n) {
  return Math.round(n * 1000) / 1000;
}

export function duracionEscena(escena) {
  return escena.duracion_real ?? escena.duracion_estimada;
}

export function inicioEscena(escena) {
  return escena.inicio_real ?? escena.inicio_estimado;
}
