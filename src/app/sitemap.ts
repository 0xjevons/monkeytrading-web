/** `sitemap.xml`: the one page, at the canonical origin. */

import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/** The route's content. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl()}/`, changeFrequency: "weekly", priority: 1 }];
}
