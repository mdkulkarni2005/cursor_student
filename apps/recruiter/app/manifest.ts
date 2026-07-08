import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vidyas OS — Recruiter",
    short_name: "Vidyas Recruiter",
    description: "Discover verified student talent — browse profiles, message candidates.",
    start_url: "/students",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#f6921e",
    icons: [
      { src: "/icon", sizes: "any", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
