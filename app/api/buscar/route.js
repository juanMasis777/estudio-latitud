import { NextResponse } from "next/server";
import { buscarVideosPexels, buscarFotosPexels } from "@/lib/fuentes/pexels";
import { buscarVideosPixabay, buscarFotosPixabay } from "@/lib/fuentes/pixabay";
import { buscarWikimedia } from "@/lib/fuentes/wikimedia";

// Cada fuente indica qué variable de entorno necesita (null = ninguna).
// Las fuentes sin clave configurada no aparecen en la interfaz.
const FUENTES = {
  "pixabay-video": { nombre: "Videos · Pixabay", buscar: buscarVideosPixabay, clave: "PIXABAY_API_KEY" },
  "pixabay-foto": { nombre: "Fotos · Pixabay", buscar: buscarFotosPixabay, clave: "PIXABAY_API_KEY" },
  wikimedia: { nombre: "Históricas · Wikimedia", buscar: buscarWikimedia, clave: null },
  "pexels-video": { nombre: "Videos · Pexels", buscar: buscarVideosPexels, clave: "PEXELS_API_KEY" },
  "pexels-foto": { nombre: "Fotos · Pexels", buscar: buscarFotosPexels, clave: "PEXELS_API_KEY" },
};

function disponible(fuente) {
  return !fuente.clave || Boolean(process.env[fuente.clave]);
}

export async function GET() {
  const fuentes = Object.entries(FUENTES)
    .filter(([, f]) => disponible(f))
    .map(([id, f]) => ({ id, nombre: f.nombre }));
  return NextResponse.json({ fuentes });
}

export async function POST(request) {
  try {
    const { consulta, fuente } = await request.json();
    if (!consulta?.trim()) {
      return NextResponse.json({ error: "Consulta vacía." }, { status: 400 });
    }
    const config = FUENTES[fuente];
    if (!config) {
      return NextResponse.json({ error: `Fuente desconocida: ${fuente}` }, { status: 400 });
    }
    if (!disponible(config)) {
      return NextResponse.json(
        { error: `Falta ${config.clave} en .env.local` },
        { status: 400 }
      );
    }

    const resultados = await config.buscar(consulta.trim());
    return NextResponse.json({ resultados });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
