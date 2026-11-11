import { NextResponse } from "next/server";
import { leerEstado, renderEnCurso, renderizarProyecto } from "@/lib/render";

export async function GET(_request, { params }) {
  const { id } = await params;
  return NextResponse.json(await leerEstado(id));
}

// Inicia el render en segundo plano. La interfaz consulta el progreso con GET.
export async function POST(_request, { params }) {
  try {
    const { id } = await params;
    if (await renderEnCurso(id)) {
      return NextResponse.json({ error: "Ya hay un render en curso." }, { status: 409 });
    }
    renderizarProyecto(id);
    return NextResponse.json({ estado: "trabajando", paso: "Preparando", progreso: 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
