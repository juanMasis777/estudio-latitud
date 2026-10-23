import { NextResponse } from "next/server";
import { leerProyecto } from "@/lib/proyectos";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    return NextResponse.json(await leerProyecto(id));
  } catch (error) {
    const estado = error.code === "ENOENT" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status: estado });
  }
}
