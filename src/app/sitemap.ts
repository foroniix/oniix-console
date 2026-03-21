import type { MetadataRoute } from "next";

const SITE_URL = "https://oniix.space";

const PUBLIC_ROUTES = [
  "",
  "/login",
  "/signup",
  "/privacy",
  "/cookies",
  "/accept-invite",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
