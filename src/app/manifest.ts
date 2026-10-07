import type { MetadataRoute } from "next";

/** PWA instalable (paso previo a publicar en tiendas vía TWA/Capacitor). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trainer",
    short_name: "Trainer",
    description: "Gestión de alumnos para personal trainers",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111214",
    theme_color: "#111214",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
