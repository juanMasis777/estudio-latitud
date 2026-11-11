"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { generarCapitulos, generarCreditos } from "@/lib/textos";
import { estilos, formatoTiempo, urlMedio } from "./utilidades";

export default function PanelRender({ proyecto }) {
  const [estado, setEstado] = useState({ estado: "inactivo" });
  const [error, setError] = useState("");

  const consultar = useCallback(async () => {
    try {
      const res = await fetch(`/api/proyectos/${proyecto.id}/render`);
      setEstado(await res.json());
    } catch {
      // Si el servidor se reinicia, se reintenta en el siguiente ciclo.
    }
  }, [proyecto.id]);

  useEffect(() => {
    fetch(`/api/proyectos/${proyecto.id}/render`)
      .then((r) => r.json())
      .then(setEstado)
      .catch(() => {});
  }, [proyecto.id]);

  useEffect(() => {
    if (estado.estado !== "trabajando") return;
    const intervalo = setInterval(consultar, 1500);
    return () => clearInterval(intervalo);
  }, [estado.estado, consultar]);

  async function renderizar() {
    setError("");
    const res = await fetch(`/api/proyectos/${proyecto.id}/render`, { method: "POST" });
    const datos = await res.json();
    if (!res.ok) return setError(datos.error);
    setEstado(datos);
  }

  async function abrir(carpeta) {
    const res = await fetch(`/api/proyectos/${proyecto.id}/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carpeta }),
    });
    if (!res.ok) setError((await res.json()).error);
  }

  const sinRecurso = proyecto.escenas.filter((e) => !e.archivo_propio && !e.seleccion).length;
  const trabajando = estado.estado === "trabajando";
  const listo = estado.estado === "listo" && estado.salida;

  return (
    <section className={`${estilos.panel} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">4. Armar el video</h2>
        <button onClick={renderizar} disabled={trabajando} className={estilos.botonPrincipal}>
          {trabajando ? "Renderizando…" : listo ? "Volver a renderizar" : "Renderizar video"}
        </button>
      </div>

      <ul className="space-y-1 text-sm text-stone-400">
        <li>MP4 · 1920×1080 · 30 fps · fotos con efecto Ken Burns · videos recortados a la duración de cada escena.</li>
        {!proyecto.narracion && (
          <li className="text-amber-400">
            Aún no subiste la narración: el video saldrá sin voz y con duraciones estimadas.
          </li>
        )}
        {sinRecurso > 0 && (
          <li className="text-amber-400">
            {sinRecurso} {sinRecurso === 1 ? "escena no tiene" : "escenas no tienen"} recurso: saldrán como pantalla
            oscura con una franja ámbar.
          </li>
        )}
        <li>Solo se vuelven a procesar las escenas que cambiaron.</li>
      </ul>

      {trabajando && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-400">
            <span>{estado.paso}</span>
            <span>{Math.round((estado.progreso || 0) * 100)}%</span>
          </div>
          <div className="h-2 rounded bg-stone-800">
            <div
              className="h-2 rounded bg-amber-600 transition-all"
              style={{ width: `${Math.round((estado.progreso || 0) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {estado.estado === "error" && (
        <pre className="whitespace-pre-wrap rounded-lg bg-red-950/40 p-3 text-xs text-red-300">{estado.mensaje}</pre>
      )}
      {estado.registro?.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-amber-300">
          {estado.registro.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {listo && (
        <div className="space-y-3">
          <video
            controls
            src={urlMedio(proyecto.id, estado.salida, estado.terminado)}
            className="aspect-video w-full rounded-lg bg-black"
          />
          <p className="text-xs text-stone-400">Duración: {formatoTiempo(estado.duracion)}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${urlMedio(proyecto.id, estado.salida, estado.terminado)}&descargar=1`}
              className={estilos.botonPrincipal}
            >
              Descargar MP4
            </a>
            <button onClick={() => abrir("salida")} className={estilos.botonBorde}>
              Abrir carpeta del video
            </button>
            <button onClick={() => abrir("clips")} className={estilos.botonBorde}>
              Abrir clips para Filmora
            </button>
            <a
              href={`${urlMedio(proyecto.id, "salida/subtitulos.srt", estado.terminado)}&descargar=1`}
              className={estilos.botonBorde}
            >
              Descargar subtítulos (.srt)
            </a>
          </div>
          <p className="text-xs text-stone-500">
            La carpeta de clips tiene cada escena numerada (001, 002…), tu narración y los subtítulos: arrástralos a
            la línea de tiempo de Filmora en orden si quieres retocar el montaje.
          </p>
        </div>
      )}
    </section>
  );
}

export function PanelPublicar({ proyecto }) {
  const creditos = useMemo(() => generarCreditos(proyecto.escenas), [proyecto.escenas]);
  const capitulos = useMemo(() => generarCapitulos(proyecto.escenas), [proyecto.escenas]);
  const usaIA = proyecto.escenas.some((e) => e.archivo_propio?.es_ia);

  return (
    <section className={`${estilos.panel} grid gap-4 md:grid-cols-2`}>
      <h2 className="font-semibold md:col-span-2">5. Para publicar en YouTube</h2>
      <BloqueTexto
        titulo="Capítulos"
        texto={capitulos.texto}
        nota={
          capitulos.aviso ||
          (proyecto.narracion
            ? "Tiempos tomados de tu narración."
            : "Tiempos estimados: sube la narración para que sean exactos.")
        }
      />
      <BloqueTexto titulo="Créditos de imágenes y videos" texto={creditos} />
      {usaIA && (
        <p className="text-sm text-amber-300 md:col-span-2">
          Usaste imágenes generadas con IA. Si son realistas y recrean hechos reales, marca «contenido alterado o
          sintético» al subir el video.
        </p>
      )}
    </section>
  );
}

function BloqueTexto({ titulo, texto, nota }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-300">{titulo}</h3>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-950 p-3 text-xs text-stone-300">
        {texto}
      </pre>
      {nota && <p className="text-xs text-stone-500">{nota}</p>}
      <button onClick={() => navigator.clipboard.writeText(texto)} className={estilos.boton}>
        Copiar
      </button>
    </div>
  );
}
