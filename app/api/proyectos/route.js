import { NextResponse } from "next/server";
import { guardarProyecto, listarProyectos } from "@/lib/proyectos";

export async function GET() {
  try {
    return NextResponse.json({ proyectos: await listarProyectos() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const proyecto = await request.json();
    if (!proyecto?.id) {
      return NextResponse.json({ error: "Proyecto sin ID." }, { status: 400 });
    }
    return NextResponse.json(await guardarProyecto(proyecto));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
