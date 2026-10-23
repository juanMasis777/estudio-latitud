import "./globals.css";

export const metadata = {
  title: "Estudio Latitud",
  description: "Herramienta de producción de video para Latitud Oscura",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-stone-950 text-stone-100">{children}</body>
    </html>
  );
}
