import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oniix",
    short_name: "Oniix",
    description:
      "Plateforme Oniix de pilotage OTT pour chaines TV, distribution mobile, programmation et operations live.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070c",
    theme_color: "#05070c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
