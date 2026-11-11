import { NextResponse } from "next/server";
import { generarPromptIA } from "@/lib/claude";

export async function POST(request) {
  try {
    const { titulo, narracion, nota_visual } = await request.json();
    if (!narracion?.trim()) {
      return NextResponse.json({ error: "La escena no tiene narración." }, { status: 400 });
    }
    const prompt = await generarPromptIA({ titulo, narracion, nota_visual });
    return NextResponse.json({ prompt });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
