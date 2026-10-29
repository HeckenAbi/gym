import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Gym Battle",
    short_name: "Gym Battle",
    description: "Protokolliere dein Krafttraining und bleib mit deiner Crew dran.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090a0c",
    theme_color: "#090a0c",
    categories: ["health", "fitness"],
    icons: [
      {
        src: "/icons/gym-battle-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/gym-battle-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/gym-battle-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
