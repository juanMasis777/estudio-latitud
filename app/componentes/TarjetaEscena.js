"use client";

import { useState } from "react";
import { estilos, formatoTiempo, quitarArchivo, subirArchivo, urlMedio } from "./utilidades";

function fuenteInicial(escena, fuentes) {
  const ids = fuentes.map((f) => f.id);
  if (escena.tipo === "historica" && ids.includes("wikimedia")) return "wikimedia";
  return ids.find((id) => id.endsWith("-video")) || ids[0];
}

const MOVIMIENTOS = [
  ["auto", "Movimiento automático"],
  ["zoom-in", "Zoom lento hacia adentro"],
  ["zoom-out", "Zoom lento hacia afuera"],
  ["pan-der", "Desplazamiento a la derecha"],
  ["pan-izq", "Desplazamiento a la izquierda"],
  ["fijo", "Sin movimiento"],
];

export default function TarjetaEscena({ proyecto, escena, fuentes, onCambiar, onProyecto }) {
  const [consulta, setConsulta] = useState(escena.consultas[0] || "");
  const [fuente, setFuente] = useState(() => fuenteInicial(escena, fuentes));
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generando, setGenerando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [esIA, setEsIA] = useState(escena.archivo_propio?.es_ia ?? escena.necesita_ia);

  async function pedir(q, f) {
    const res = await fetch("/api/buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consulta: q, fuente: f }),
    });
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error);
    return datos.resultados;
  }

  // Si una búsqueda no da resultados, prueba sola las otras sugerencias de la escena.
  async function buscar(q = consulta, f = fuente) {
    setBuscando(true);
    setError("");
    setAviso("");
    try {
      const intentos = [q, ...escena.consultas.filter((c) => c !== q)];
      for (const intento of intentos) {
        const encontrados = await pedir(intento, f);
        if (encontrados.length > 0) {
          setResultados(encontrados);
          if (intento !== q) {
            setConsulta(intento);
            setAviso(`"${q}" no dio resultados; se muestran los de "${intento}".`);
          }
          return;
        }
      }
      setResultados([]);
      setError("Sin resultados. Prueba una consulta más corta (ej. un nombre de lugar) u otra fuente.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBuscando(false);
    }
  }

  async function generarPrompt() {
    setGenerando(true);
    setError("");
    try {
      const res = await fetch("/api/prompt-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: proyecto.titulo,
          narracion: escena.narracion,
          nota_visual: escena.nota_visual,
        }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error);
      setPrompt(datos.prompt);
      if (!escena.necesita_ia) onCambiar({ necesita_ia: true });
      setEsIA(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerando(false);
    }
  }

  async function subirPropio(archivo) {
    if (!archivo) return;
    setSubiendo(true);
    setError("");
    try {
      onProyecto(
        await subirArchivo(proyecto.id, { tipo: "escena", escenaId: escena.id, es_ia: String(esIA), archivo })
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function quitarPropio() {
    try {
      onProyecto(await quitarArchivo(proyecto.id, "escena", escena.id));
    } catch (e) {
      setError(e.message);
    }
  }

  const alineada = escena.duracion_real != null;
  const inicio = alineada ? escena.inicio_real : escena.inicio_estimado;
  const duracion = alineada ? escena.duracion_real : escena.duracion_estimada;
  const propio = escena.archivo_propio;
  const tipoRecurso = propio?.tipo || escena.seleccion?.tipo || null;
  const sinRecurso = !propio && !escena.seleccion;

  return (
    <article className={`${estilos.panel} ${sinRecurso ? "" : "border-stone-700"}`}>
      {escena.capitulo && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
          Capítulo · {escena.capitulo}
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span className="font-mono text-amber-500">#{escena.numero}</span>
        <span className="text-stone-500">
          {formatoTiempo(inicio)} · {alineada ? `${duracion.toFixed(1)} s (con tu voz)` : `~${duracion} s`}
        </span>
        <span className="rounded bg-stone-800 px-2 py-0.5 text-xs">{escena.tipo}</span>
        {sinRecurso && <span className="rounded bg-stone-800 px-2 py-0.5 text-xs text-amber-400">Sin recurso</span>}
        {escena.personas_sensibles && (
          <span className="rounded bg-red-950 px-2 py-0.5 text-xs text-red-300">
            Tema sensible: no uses personas identificables
          </span>
        )}
      </div>

      <p className="mt-2 leading-relaxed">{escena.narracion}</p>
      {escena.nota_visual && (
        <p className="mt-1 text-sm italic text-stone-400">Idea visual: {escena.nota_visual}</p>
      )}

      {propio && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-950/30 p-2">
          {propio.tipo === "foto" ? (
            <img src={urlMedio(proyecto.id, propio.ruta)} alt="" className="h-14 w-24 rounded object-cover" />
          ) : (
            <video src={urlMedio(proyecto.id, propio.ruta)} muted className="h-14 w-24 rounded object-cover" />
          )}
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium">
              Archivo propio: {propio.nombre} {propio.es_ia && "· generado con IA"}
            </p>
            <p className="text-stone-400">Tiene prioridad sobre el recurso elegido en las búsquedas.</p>
          </div>
          <button onClick={quitarPropio} className="text-xs text-stone-400 hover:text-white">
            Quitar
          </button>
        </div>
      )}

      {escena.seleccion && (
        <div
          className={`mt-3 flex items-center gap-3 rounded-lg border p-2 ${
            propio ? "border-stone-800 opacity-60" : "border-amber-800 bg-amber-950/30"
          }`}
        >
          <img src={escena.seleccion.miniatura} alt="" className="h-14 w-24 rounded object-cover" />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium">
              Elegido: {escena.seleccion.tipo} de {escena.seleccion.fuente}
            </p>
            <p className="truncate text-stone-400">{escena.seleccion.credito}</p>
          </div>
          <button
            onClick={() => onCambiar({ seleccion: null })}
            className="text-xs text-stone-400 hover:text-white"
          >
            Quitar
          </button>
        </div>
      )}

      {/* Ajustes de montaje */}
      {tipoRecurso && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-400">
          {tipoRecurso === "foto" ? (
            <label className="flex items-center gap-2">
              Movimiento
              <select
                value={escena.movimiento || "auto"}
                onChange={(e) => onCambiar({ movimiento: e.target.value })}
                className={estilos.campo}
              >
                {MOVIMIENTOS.map(([valor, nombre]) => (
                  <option key={valor} value={valor}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex items-center gap-2">
              Empezar el clip en el segundo
              <input
                type="number"
                min="0"
                step="1"
                value={escena.recorte_inicio ?? 0}
                onChange={(e) => onCambiar({ recorte_inicio: Math.max(0, Number(e.target.value) || 0) })}
                className={`${estilos.campo} w-20`}
              />
            </label>
          )}
          <label className="flex items-center gap-2">
            Entrada
            <select
              value={escena.transicion || "corte"}
              onChange={(e) => onCambiar({ transicion: e.target.value })}
              className={estilos.campo}
            >
              <option value="corte">Corte directo</option>
              <option value="fundido">Fundido desde negro</option>
            </select>
          </label>
        </div>
      )}

      {/* Búsqueda */}
      <div className="mt-3 flex flex-wrap gap-2">
        {escena.consultas.map((q) => (
          <button
            key={q}
            onClick={() => {
              setConsulta(q);
              buscar(q);
            }}
            className="rounded-full border border-stone-700 px-3 py-1 text-xs hover:border-amber-600"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          className={`${estilos.campo} min-w-48 flex-1`}
          placeholder="Consulta en inglés"
        />
        <select value={fuente} onChange={(e) => setFuente(e.target.value)} className={estilos.campo}>
          {fuentes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>
        <button onClick={() => buscar()} disabled={buscando} className={estilos.boton}>
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {/* Archivo propio e imagen IA */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-400">
        <label className={`${estilos.botonBorde} cursor-pointer`}>
          {subiendo ? "Subiendo…" : "Subir imagen o video propio"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            className="hidden"
            disabled={subiendo}
            onChange={(e) => subirPropio(e.target.files?.[0])}
          />
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={esIA} onChange={(e) => setEsIA(e.target.checked)} />
          Es una imagen generada con IA
        </label>
        <button onClick={generarPrompt} disabled={generando} className={estilos.botonBorde}>
          {generando ? "Escribiendo prompt…" : "Generar prompt IA"}
        </button>
      </div>

      {prompt && (
        <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950 p-3">
          <p className="mb-1 text-xs text-stone-400">
            Pégalo en ChatGPT o Canva, descarga la imagen y súbela con «Subir imagen o video propio».
          </p>
          <p className="font-mono text-xs leading-relaxed text-stone-200">{prompt}</p>
          <button onClick={() => navigator.clipboard.writeText(prompt)} className={`${estilos.boton} mt-2`}>
            Copiar prompt
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {aviso && <p className="mt-2 text-sm text-amber-400">{aviso}</p>}

      {resultados.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {resultados.map((r) => (
            <button
              key={r.id}
              onClick={() => onCambiar({ seleccion: r, necesita_ia: false, recorte_inicio: 0 })}
              className={`overflow-hidden rounded-lg border text-left ${
                escena.seleccion?.id === r.id ? "border-amber-500" : "border-stone-800 hover:border-stone-500"
              }`}
            >
              <img src={r.miniatura} alt={r.descripcion || ""} className="aspect-video w-full object-cover" />
              <div className="space-y-0.5 p-2 text-xs">
                <p className="truncate text-stone-300">{r.descripcion || r.autor}</p>
                <p className="truncate text-stone-500">{r.autor}</p>
                <p className="text-stone-500">
                  {r.tipo === "video" && r.duracion ? `${r.duracion}s · ` : ""}
                  {r.ancho && r.alto ? `${r.ancho}×${r.alto}` : r.fuente}
                </p>
                <p className="truncate text-stone-500">{r.licencia}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
