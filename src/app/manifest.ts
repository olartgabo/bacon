import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "bacon",
    short_name: "bacon",
    description: "Agent-first task tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf5ea",
    theme_color: "#29292d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
