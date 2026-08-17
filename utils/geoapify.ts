import { GEOAPIFY_API_KEY } from "../url";

const GEOAPIFY_STATIC_BASE = "https://maps.geoapify.com/v1/staticmap";

type Marker = {
  lon: number;
  lat: number;
  type?: string; // e.g. "awesome" or "material"
  color?: string; // hex color
  icon?: string; // e.g. "paw" or "tree"
  size?: string; // e.g. "x-large"
  icontype?: string; // e.g. "awesome"
};

export const buildStaticMapUrl = ({
  centerLon,
  centerLat,
  zoom = 14,
  width = 600,
  height = 400,
  markers = [],
}: {
  centerLon: number;
  centerLat: number;
  zoom?: number;
  width?: number;
  height?: number;
  markers?: Marker[];
}) => {
  const params = new URLSearchParams();
  params.set("style", "osm-bright-smooth");
  params.set("width", String(width));
  params.set("height", String(height));
  params.set("center", `lonlat:${centerLon},${centerLat}`);
  params.set("zoom", String(zoom));

  if (Array.isArray(markers) && markers.length > 0) {
    const markerStr = markers
      .map((m) => {
        const parts = [`lonlat:${m.lon},${m.lat}`];
        const attrs: string[] = [];
        if (m.type) attrs.push(`type:${m.type}`);
        if (m.color) attrs.push(`color:${m.color}`);
        if (m.size) attrs.push(`size:${m.size}`);
        if (m.icon) attrs.push(`icon:${m.icon}`);
        if (m.icontype) attrs.push(`icontype:${m.icontype}`);
        if (attrs.length > 0) parts.push(attrs.join(";"));
        return parts.join(";");
      })
      .join("|");

    params.set("marker", markerStr);
  }

  if (!GEOAPIFY_API_KEY) {
    console.warn("GEOAPIFY_API_KEY is not set. Static map URL will be missing apiKey.");
  } else {
    params.set("apiKey", GEOAPIFY_API_KEY);
  }

  return `${GEOAPIFY_STATIC_BASE}?${params.toString()}`;
};

export default buildStaticMapUrl;
