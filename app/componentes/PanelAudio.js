"use client";

import { useState } from "react";
import { estilos, formatoTiempo, quitarArchivo, subirArchivo, urlMedio } from "./utilidades";

export default function PanelAudio({ proyecto, onProyecto, onCambiar }) {
  const [subiendo, setSubiendo] = useState("");
  const [error, setError] = useState("");

  async function subir(tipo, archivo) {
    if (!archivo) return;
    setSubiendo(tipo);
    setError("");
    try {
      onProyecto(await subirArchivo(proyecto.id, { tipo, archivo }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo("");
    }
  }

  async function quitar(tipo) {
    setError("");
    try {
      onProyecto(await quitarArchivo(proyecto.id, tipo));
    } catch (e) {
      setError(e.message);
    }
  }

  const { narracion, musica } = proyecto;

  return (
    <section className={`${estilos.panel} grid gap-4 md:grid-cols-2`}>
      <div className="space-y-2">
        <h2 className="font-semibold">1. Tu narración</h2>
        {narracion ? (
          <>
            <p className="text-sm text-emerald-300">
              ✓ {narracion.nombre} · {formatoTiempo(narracion.duracion)} · escenas alineadas con tu voz
            </p>
            <audio controls src={urlMedio(proyecto.id, narracion.ruta, narracion.alineada)} className="w-full" />
          </>
        ) : (
          <p className="text-sm text-stone-400">
            Sube tu audio grabado (MP3, WAV o M4A). La app ajusta cada escena a tus pausas reales.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${estilos.boton} cursor-pointer`}>
            {subiendo === "narracion" ? "Analizando audio…" : narracion ? "Reemplazar" : "Subir narración"}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={Boolean(subiendo)}
              onChange={(e) => subir("narracion", e.target.files?.[0])}
            />
          </label>
          {narracion && (
            <button onClick={() => quitar("narracion")} className="text-xs text-stone-400 hover:text-white">
              Quitar
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold">2. Música de fondo (opcional)</h2>
        {musica ? (
          <>
            <p className="text-sm text-emerald-300">✓ {musica.nombre}</p>
            <label className="flex items-center gap-3 text-sm text-stone-400">
              Volumen
              <input
                type="range"
                min="0.02"
                max="0.4"
                step="0.01"
                value={musica.volumen ?? 0.12}
                onChange={(e) => onCambiar({ musica: { ...musica, volumen: Number(e.target.value) } })}
              />
              <span className="w-10 text-right">{Math.round((musica.volumen ?? 0.12) * 100)}%</span>
            </label>
          </>
        ) : (
          <p className="text-sm text-stone-400">
            Usa pistas de la Biblioteca de audio de YouTube. Se repite en bucle y baja al final.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${estilos.boton} cursor-pointer`}>
            {subiendo === "musica" ? "Subiendo…" : musica ? "Reemplazar" : "Subir música"}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={Boolean(subiendo)}
              onChange={(e) => subir("musica", e.target.files?.[0])}
            />
          </label>
          {musica && (
            <button onClick={() => quitar("musica")} className="text-xs text-stone-400 hover:text-white">
              Quitar
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-400 md:col-span-2">{error}</p>}
    </section>
  );
}
