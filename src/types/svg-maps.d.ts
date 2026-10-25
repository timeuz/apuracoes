declare module '@svg-maps/brazil' {
  export interface Location {
    id: string; // 'ac', 'sp', 'rj', etc.
    name: string;
    path: string; // SVG path data (d)
  }

  export interface BrazilMapData {
    label: string;
    viewBox: string;
    locations: Location[];
  }

  const BrazilMap: BrazilMapData;
  export default BrazilMap;
}

declare module '@svg-maps/world' {
  export interface Location {
    id: string; // 'br', 'us', 'pt', etc.
    name: string;
    path: string;
  }

  export interface WorldMapData {
    label: string;
    viewBox: string;
    locations: Location[];
  }

  const WorldMap: WorldMapData;
  export default WorldMap;
}
