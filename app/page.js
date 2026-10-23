"use client";

import { useEffect, useMemo, useState } from "react";

function formatoTiempo(segundos = 0) {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Inicio() {
  const [proyectos, setProyectos] = useState([]);
  const [proyecto, setProyecto] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [guion, setGuion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState("");

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

  async function guardar(siguiente = proyecto) {
    const res = await fetch("/api/proyectos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(siguiente),
    });
    if (res.ok) {
      setGuardado("Guardado");
      setTimeout(() => setGuardado(""), 1500);
    }
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
          <button
            onClick={crearEscenas}
            disabled={cargando}
            className="rounded-lg bg-amber-700 px-4 py-2 font-medium hover:bg-amber-600 disabled:opacity-50"
          >
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
        Guion → escenas → imágenes y clips con licencia → (pronto) video armado.
      </p>
    </header>
  );
}

function EditorProyecto({ proyecto, guardado, onVolver, onActualizarEscena }) {
  const [mostrarCreditos, setMostrarCreditos] = useState(false);
  const [fuentes, setFuentes] = useState([]);

  useEffect(() => {
    fetch("/api/buscar")
      .then((r) => r.json())
      .then((d) => setFuentes(d.fuentes || []))
      .catch(() => {});
  }, []);
  const total = proyecto.escenas.reduce((s, e) => s + e.duracion_estimada, 0);
  const listas = proyecto.escenas.filter((e) => e.seleccion || e.necesita_ia).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={onVolver} className="text-sm text-stone-400 hover:text-white">
            ← Proyectos
          </button>
          <h1 className="text-2xl font-bold">{proyecto.titulo}</h1>
          <p className="text-sm text-stone-400">
            {proyecto.escenas.length} escenas · duración estimada {formatoTiempo(total)} ·{" "}
            {listas}/{proyecto.escenas.length} con recurso {guardado && `· ${guardado}`}
          </p>
        </div>
        <button
          onClick={() => setMostrarCreditos((v) => !v)}
          className="rounded-lg border border-stone-700 px-3 py-2 text-sm hover:border-amber-600"
        >
          {mostrarCreditos ? "Ocultar créditos" : "Ver créditos para la descripción"}
        </button>
      </div>

      {mostrarCreditos && <Creditos escenas={proyecto.escenas} />}

      <div className="mt-6 space-y-6">
        {fuentes.length > 0 && proyecto.escenas.map((escena) => (
          <TarjetaEscena
            key={escena.id}
            escena={escena}
            fuentes={fuentes}
            onCambiar={(cambios) => onActualizarEscena(escena.id, cambios)}
          />
        ))}
      </div>

      <p className="mt-10 text-xs text-stone-500">
        Imágenes y videos de{" "}
        <a href="https://pixabay.com" className="underline" target="_blank" rel="noreferrer">
          Pixabay
        </a>
        ,{" "}
        <a href="https://www.pexels.com" className="underline" target="_blank" rel="noreferrer">
          Pexels
        </a>{" "}
        y{" "}
        <a
          href="https://commons.wikimedia.org"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Wikimedia Commons
        </a>
        . Revisa siempre la licencia de cada archivo antes de publicar.
      </p>
    </main>
  );
}

function fuenteInicial(escena, fuentes) {
  const ids = fuentes.map((f) => f.id);
  if (escena.tipo === "historica" && ids.includes("wikimedia")) return "wikimedia";
  return ids.find((id) => id.endsWith("-video")) || ids[0];
}

function TarjetaEscena({ escena, fuentes, onCambiar }) {
  const [consulta, setConsulta] = useState(escena.consultas[0] || "");
  const [fuente, setFuente] = useState(() => fuenteInicial(escena, fuentes));
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  async function buscar(q = consulta, f = fuente) {
    setBuscando(true);
    setError("");
    try {
      const res = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta: q, fuente: f }),
      });
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error);
      setResultados(datos.resultados);
      if (datos.resultados.length === 0) setError("Sin resultados. Prueba otra consulta o fuente.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <article className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span className="font-mono text-amber-500">#{escena.numero}</span>
        <span className="text-stone-500">
          {formatoTiempo(escena.inicio_estimado)} · ~{escena.duracion_estimada}s
        </span>
        <span className="rounded bg-stone-800 px-2 py-0.5 text-xs">{escena.tipo}</span>
        {escena.personas_sensibles && (
          <span className="rounded bg-red-950 px-2 py-0.5 text-xs text-red-300">
            Tema sensible: no uses personas identificables de bancos de imágenes
          </span>
        )}
      </div>

      <p className="mt-2 leading-relaxed">{escena.narracion}</p>
      {escena.nota_visual && (
        <p className="mt-1 text-sm italic text-stone-400">Idea visual: {escena.nota_visual}</p>
      )}

      {escena.seleccion && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-amber-800 bg-amber-950/30 p-2">
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
          className="min-w-48 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-sm outline-none focus:border-amber-600"
          placeholder="Consulta en inglés"
        />
        <select
          value={fuente}
          onChange={(e) => setFuente(e.target.value)}
          className="rounded-lg border border-stone-700 bg-stone-950 px-2 py-1.5 text-sm"
        >
          {fuentes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={() => buscar()}
          disabled={buscando}
          className="rounded-lg bg-stone-700 px-3 py-1.5 text-sm hover:bg-stone-600 disabled:opacity-50"
        >
          {buscando ? "Buscando…" : "Buscar"}
        </button>
        <label className="flex items-center gap-1 text-xs text-stone-400">
          <input
            type="checkbox"
            checked={escena.necesita_ia}
            onChange={(e) => onCambiar({ necesita_ia: e.target.checked })}
          />
          Usar imagen IA
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {resultados.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {resultados.map((r) => (
            <button
              key={r.id}
              onClick={() => onCambiar({ seleccion: r, necesita_ia: false })}
              className={`group overflow-hidden rounded-lg border text-left ${
                escena.seleccion?.id === r.id
                  ? "border-amber-500"
                  : "border-stone-800 hover:border-stone-500"
              }`}
            >
              <img src={r.miniatura} alt={r.descripcion || ""} className="aspect-video w-full object-cover" />
              <div className="space-y-0.5 p-2 text-xs">
                <p className="truncate text-stone-300">{r.autor}</p>
                <p className="text-stone-500">
                  {r.tipo === "video" ? `${r.duracion}s · ` : ""}
                  {r.ancho}×{r.alto}
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

function Creditos({ escenas }) {
  const texto = useMemo(() => {
    const unicos = new Map();
    escenas.forEach((e) => e.seleccion && unicos.set(e.seleccion.id, e.seleccion.credito));
    if (unicos.size === 0) return "Aún no has elegido recursos.";
    return ["Imágenes y videos:", ...[...unicos.values()].map((c) => `• ${c}`)].join("\n");
  }, [escenas]);

  return (
    <div className="mt-4 rounded-xl border border-stone-800 bg-stone-950 p-4">
      <pre className="whitespace-pre-wrap text-xs text-stone-300">{texto}</pre>
      <button
        onClick={() => navigator.clipboard.writeText(texto)}
        className="mt-3 rounded-lg bg-stone-700 px-3 py-1.5 text-sm hover:bg-stone-600"
      >
        Copiar
      </button>
    </div>
  );
}
