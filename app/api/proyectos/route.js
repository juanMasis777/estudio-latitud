import { NextResponse } from "next/server";
import { guardarProyecto, leerProyecto, listarProyectos } from "@/lib/proyectos";

export async function GET() {
  try {
    return NextResponse.json({ proyectos: await listarProyectos() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Campos que solo cambia el servidor al subir archivos. Si la interfaz manda
// una versión vieja (por ejemplo, justo después de subir la narración), se conservan.
const CAMPOS_ESCENA_SERVIDOR = ["archivo_propio", "inicio_real", "duracion_real"];

function fusionar(guardado, entrante) {
  if (!guardado) return entrante;
  const porId = new Map((guardado.escenas || []).map((e) => [e.id, e]));
  const escenas = (entrante.escenas || []).map((e) => {
    const previa = porId.get(e.id);
    if (!previa) return e;
    const fusion = { ...e };
    for (const campo of CAMPOS_ESCENA_SERVIDOR) {
      if (campo in previa) fusion[campo] = previa[campo];
      else delete fusion[campo];
    }
    return fusion;
  });
  const resultado = { ...entrante, escenas };
  if (guardado.narracion) resultado.narracion = guardado.narracion;
  else delete resultado.narracion;
  if (guardado.musica) {
    resultado.musica = { ...guardado.musica, volumen: entrante.musica?.volumen ?? guardado.musica.volumen };
  } else delete resultado.musica;
  return resultado;
}

export async function PUT(request) {
  try {
    const proyecto = await request.json();
    if (!proyecto?.id) {
      return NextResponse.json({ error: "Proyecto sin ID." }, { status: 400 });
    }
    let guardado = null;
    try {
      guardado = await leerProyecto(proyecto.id);
    } catch {
      guardado = null;
    }
    return NextResponse.json(await guardarProyecto(fusionar(guardado, proyecto)));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
