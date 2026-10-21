/** `robots.txt`: everything may be crawled, and the sitemap is at the canonical origin. */

import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/** The route's content. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
