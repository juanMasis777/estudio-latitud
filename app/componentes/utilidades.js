export function formatoTiempo(segundos = 0) {
  const total = Math.max(0, Math.round(segundos));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function urlMedio(proyectoId, ruta, version) {
  if (!ruta) return null;
  const limpio = ruta.split("/").map(encodeURIComponent).join("/");
  return `/api/medios/${proyectoId}/${limpio}${version ? `?v=${version}` : ""}`;
}

// Sube un archivo y devuelve el proyecto actualizado por el servidor.
export async function subirArchivo(proyectoId, campos) {
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(campos)) formulario.append(clave, valor);
  const res = await fetch(`/api/proyectos/${proyectoId}/archivo`, { method: "POST", body: formulario });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.error);
  return datos;
}

export async function quitarArchivo(proyectoId, tipo, escenaId) {
  const params = new URLSearchParams({ tipo });
  if (escenaId) params.set("escenaId", escenaId);
  const res = await fetch(`/api/proyectos/${proyectoId}/archivo?${params}`, { method: "DELETE" });
  const datos = await res.json();
  if (!res.ok) throw new Error(datos.error);
  return datos;
}

export const estilos = {
  boton: "rounded-lg bg-stone-700 px-3 py-1.5 text-sm hover:bg-stone-600 disabled:opacity-50",
  botonPrincipal:
    "rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-50",
  botonBorde: "rounded-lg border border-stone-700 px-3 py-1.5 text-sm hover:border-amber-600",
  campo:
    "rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-sm outline-none focus:border-amber-600",
  panel: "rounded-xl border border-stone-800 bg-stone-900/50 p-4",
};
