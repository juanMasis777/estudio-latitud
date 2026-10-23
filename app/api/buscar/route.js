import { NextResponse } from "next/server";
import { buscarVideosPexels, buscarFotosPexels } from "@/lib/fuentes/pexels";
import { buscarWikimedia } from "@/lib/fuentes/wikimedia";

const FUENTES = {
  "pexels-video": buscarVideosPexels,
  "pexels-foto": buscarFotosPexels,
  wikimedia: buscarWikimedia,
};

export async function POST(request) {
  try {
    const { consulta, fuente } = await request.json();
    if (!consulta?.trim()) {
      return NextResponse.json({ error: "Consulta vacía." }, { status: 400 });
    }
    const buscar = FUENTES[fuente];
    if (!buscar) {
      return NextResponse.json({ error: `Fuente desconocida: ${fuente}` }, { status: 400 });
    }

    const resultados = await buscar(consulta.trim());
    return NextResponse.json({ resultados });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
