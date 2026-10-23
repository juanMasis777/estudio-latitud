import { NextResponse } from "next/server";
import { dividirEnEscenas } from "@/lib/claude";
import { crearId, guardarProyecto } from "@/lib/proyectos";


export async function POST(request) {
  try {
    const { titulo, guion } = await request.json();
    if (!titulo?.trim() || !guion?.trim()) {
      return NextResponse.json(
        { error: "Escribe un título y pega el guion." },
        { status: 400 }
      );
    }

    const escenas = await dividirEnEscenas(guion);
    const proyecto = await guardarProyecto({
      id: crearId(titulo),
      titulo: titulo.trim(),
      guion,
      escenas,
      creado: new Date().toISOString(),
    });

    return NextResponse.json(proyecto);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
