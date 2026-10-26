/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TILE_URL?: string;
  readonly VITE_TILE_ATTRIBUTION?: string;
  readonly VITE_TILE_MAX_ZOOM?: string;
  readonly VITE_ROUTING_PROVIDER?: string;
  readonly VITE_OSRM_URL?: string;
  readonly VITE_OSRM_PROFILE?: string;
  readonly VITE_ROUTING_PROXY_URL?: string;
  readonly VITE_LOCATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
