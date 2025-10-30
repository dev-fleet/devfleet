import { MetadataRoute } from "next";
import { Folder, MdxFile, Meta, MetaJsonFile, PageMapItem } from "nextra";
import { getPageMap } from "nextra/page-map";
import { URL } from "url";

export const dynamic = "force-static";

interface PageType {
  title: string;
  type?: "page";
  display?: "hidden" | "normal" | string;
}

interface SitemapEntry {
  url: string;
  lastModified: string;
}

export function isPageType(value: unknown): value is PageType {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if ("title" in candidate) {
    if ("type" in candidate && candidate.type !== "page") {
      return false;
    }

    return true;
  }

  return false;
}

const isMetaJSONFile = (value: unknown): value is MetaJsonFile =>
  typeof value === "object" && value !== null && "data" in value;

const isFolder = (value: unknown): value is Folder =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  "route" in value &&
  "children" in value;

const isMDXFile = (value: unknown): value is MdxFile =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  "route" in value &&
  "frontMatter" in value;

// Filter out hidden pages
const isNotHiddenPage = (meta: Meta): boolean =>
  !isPageType(meta) || meta.display !== "hidden";

const toSitemapEntry = (pageMapEntry: PageMapItem): SitemapEntry[] => {
  if (isFolder(pageMapEntry)) {
    return parsePageMapItems(pageMapEntry.children);
  } else if (isMDXFile(pageMapEntry)) {
    const { frontMatter, route } = pageMapEntry;

    return [
      {
        url: `/docs${route === "/" ? "" : route}`,
        lastModified: frontMatter?.timestamp
          ? new Date(frontMatter.timestamp).toISOString()
          : new Date().toISOString(),
      },
    ];
  }

  return [];
};

const parsePageMapItems = (items: PageMapItem[]): SitemapEntry[] => {
  const metadata = items.find((item) => isMetaJSONFile(item))?.data;

  return items
    .filter(
      (item) =>
        !!item &&
        !isMetaJSONFile(item) &&
        (!metadata?.[item.name] || isNotHiddenPage(metadata[item.name]!))
    )
    .flatMap((pageMapEntry) => toSitemapEntry(pageMapEntry));
};

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const baseUrl = `${process.env.NEXT_PUBLIC_SITE_URL}`;
  const pageMap = await getPageMap();

  return parsePageMapItems(pageMap).map((entry) => ({
    url: new URL(entry.url, baseUrl).toString(),
    lastModified: entry.lastModified,
  }));
};

export default sitemap;
