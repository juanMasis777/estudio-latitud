import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { asegurarCarpeta, rutaDentro } from "@/lib/medios";

// Abre la carpeta del proyecto en el explorador de archivos de tu PC.
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { carpeta } = await request.json();
    if (!["clips", "salida"].includes(carpeta)) {
      return NextResponse.json({ error: "Carpeta no válida." }, { status: 400 });
    }
    const ruta = await asegurarCarpeta(rutaDentro(id, carpeta));
    const comando =
      process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
    spawn(comando, [ruta], { detached: true, stdio: "ignore", windowsHide: false }).unref();
    return NextResponse.json({ ruta });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
