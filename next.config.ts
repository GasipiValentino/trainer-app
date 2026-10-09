import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache del navegador para páginas dinámicas: volver a una pantalla vista
    // hace menos de 60 s es instantáneo. Las server actions (revalidatePath)
    // y router.refresh() la invalidan, así que lo que edita el usuario se ve al toque.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
