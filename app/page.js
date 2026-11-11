"use client";

import { useEffect, useRef, useState } from "react";
import PanelAudio from "./componentes/PanelAudio";
import PanelRender, { PanelPublicar } from "./componentes/PanelRender";
import TarjetaEscena from "./componentes/TarjetaEscena";
import { estilos, formatoTiempo } from "./componentes/utilidades";

export default function Inicio() {
  const [proyectos, setProyectos] = useState([]);
  const [proyecto, setProyecto] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [guion, setGuion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState("");
  const temporizador = useRef(null);

  useEffect(() => {
    fetch("/api/proyectos")
      .then((r) => r.json())
      .then((d) => setProyectos(d.proyectos || []))
      .catch(() => {});
  }, [proyecto?.id]);

  async function crearEscenas() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/escenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, guion }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error);
      setProyecto(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  async function abrirProyecto(id) {
    setError("");
    const res = await fetch(`/api/proyectos/${id}`);
    const datos = await res.json();
    if (!res.ok) return setError(datos.error);
    setProyecto(datos);
  }

  // Guarda medio segundo después del último cambio para no enviar una petición por cada tecla.
  function guardar(siguiente) {
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(async () => {
      const res = await fetch("/api/proyectos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(siguiente),
      });
      if (res.ok) {
        setGuardado("Guardado");
        setTimeout(() => setGuardado(""), 1500);
      }
    }, 500);
  }

  function actualizarProyecto(cambios) {
    setProyecto((p) => {
      const siguiente = { ...p, ...cambios };
      guardar(siguiente);
      return siguiente;
    });
  }

  function actualizarEscena(id, cambios) {
    setProyecto((p) => {
      const siguiente = {
        ...p,
        escenas: p.escenas.map((e) => (e.id === id ? { ...e, ...cambios } : e)),
      };
      guardar(siguiente);
      return siguiente;
    });
  }

  if (!proyecto) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Encabezado />
        <section className="mt-8 space-y-4 rounded-xl border border-stone-800 bg-stone-900/60 p-5">
          <h2 className="text-lg font-semibold">Nuevo video</h2>
          <input
            className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 outline-none focus:border-amber-600"
            placeholder="Título del video (ej. Puerto del Hambre)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <textarea
            className="h-72 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-sm outline-none focus:border-amber-600"
            placeholder="Pega aquí el guion completo, con tus indicaciones de edición incluidas."
            value={guion}
            onChange={(e) => setGuion(e.target.value)}
          />
          <button onClick={crearEscenas} disabled={cargando} className={estilos.botonPrincipal}>
            {cargando ? "Dividiendo en escenas…" : "Dividir en escenas"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </section>

        {proyectos.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Proyectos guardados</h2>
            <ul className="divide-y divide-stone-800 rounded-xl border border-stone-800">
              {proyectos.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => abrirProyecto(p.id)}
                    className="flex w-full justify-between px-4 py-3 text-left hover:bg-stone-900"
                  >
                    <span>{p.titulo}</span>
                    <span className="text-sm text-stone-500">{p.escenas} escenas</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

  return (
    <EditorProyecto
      proyecto={proyecto}
      guardado={guardado}
      onVolver={() => setProyecto(null)}
      onProyecto={setProyecto}
      onActualizarProyecto={actualizarProyecto}
      onActualizarEscena={actualizarEscena}
    />
  );
}

function Encabezado() {
  return (
    <header>
      <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Latitud Oscura</p>
      <h1 className="text-3xl font-bold">Estudio Latitud</h1>
      <p className="mt-1 text-stone-400">
        Guion → escenas → imágenes y clips con licencia → tu narración → video armado.
      </p>
    </header>
  );
}

function EditorProyecto({ proyecto, guardado, onVolver, onProyecto, onActualizarProyecto, onActualizarEscena }) {
  const [fuentes, setFuentes] = useState([]);

  useEffect(() => {
    fetch("/api/buscar")
      .then((r) => r.json())
      .then((d) => setFuentes(d.fuentes || []))
      .catch(() => {});
  }, []);

  const total = proyecto.narracion?.duracion ?? proyecto.escenas.reduce((s, e) => s + e.duracion_estimada, 0);
  const listas = proyecto.escenas.filter((e) => e.seleccion || e.archivo_propio).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <button onClick={onVolver} className="text-sm text-stone-400 hover:text-white">
          ← Proyectos
        </button>
        <h1 className="text-2xl font-bold">{proyecto.titulo}</h1>
        <p className="text-sm text-stone-400">
          {proyecto.escenas.length} escenas · {proyecto.narracion ? "duración" : "duración estimada"}{" "}
          {formatoTiempo(total)} · {listas}/{proyecto.escenas.length} con recurso {guardado && `· ${guardado}`}
        </p>
      </div>

      <PanelAudio proyecto={proyecto} onProyecto={onProyecto} onCambiar={onActualizarProyecto} />

      <section className="space-y-4">
        <h2 className="font-semibold">3. Elige un recurso para cada escena</h2>
        {fuentes.length > 0 &&
          proyecto.escenas.map((escena) => (
            <TarjetaEscena
              key={escena.id}
              proyecto={proyecto}
              escena={escena}
              fuentes={fuentes}
              onProyecto={onProyecto}
              onCambiar={(cambios) => onActualizarEscena(escena.id, cambios)}
            />
          ))}
      </section>

      <PanelRender proyecto={proyecto} />
      <PanelPublicar proyecto={proyecto} />

      <p className="text-xs text-stone-500">
        Recursos de Pixabay, Pexels, Wikimedia Commons, Library of Congress e Internet Archive. En Internet Archive la
        licencia la declara quien sube el archivo: revisa siempre la página original antes de publicar.
      </p>
    </main>
  );
}
