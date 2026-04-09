// HERE Maps JS API v3.1 Type Declarations
declare namespace H {
  namespace service {
    class Platform {
      constructor(options: { apikey: string });
      createDefaultLayers(params?: any): any;
      getApiKey(): string;
    }
  }

  class Map {
    constructor(element: HTMLElement, layer: any, options?: {
      center?: { lat: number; lng: number };
      zoom?: number;
      pixelRatio?: number;
      padding?: { top: number; right: number; bottom: number; left: number };
    });
    getCenter(): { lat: number; lng: number };
    setCenter(center: { lat: number; lng: number }, animate?: boolean): void;
    getZoom(): number;
    setZoom(zoom: number, animate?: boolean): void;
    getViewModel(): ViewModel;
    getViewPort(): ViewPort;
    addLayer(layer: any): void;
    removeLayer(layer: any): void;
    addObject(obj: any): void;
    removeObject(obj: any): void;
    getObjects(): any[];
    addEventListener(type: string, handler: Function, capture?: boolean): void;
    removeEventListener(type: string, handler: Function, capture?: boolean): void;
    screenToGeo(x: number, y: number): { lat: number; lng: number } | null;
    geoToScreen(point: { lat: number; lng: number }): { x: number; y: number } | null;
    getElement(): HTMLElement;
    dispose(): void;
    setBaseLayer(layer: any): void;
    getBaseLayer(): any;
    getLayers(): any;
  }

  class ViewModel {
    setLookAtData(data: {
      position?: { lat: number; lng: number };
      zoom?: number;
      bounds?: geo.Rect;
      tilt?: number;
      heading?: number;
    }, animate?: boolean): void;
    getLookAtData(): any;
  }

  class ViewPort {
    resize(): void;
    setPadding(top: number, right: number, bottom: number, left: number): void;
  }

  namespace map {
    class Group {
      constructor();
      addObject(obj: any): void;
      removeObject(obj: any): void;
      removeAll(): void;
      getObjects(): any[];
      forEach(callback: (obj: any, idx: number, group: Group) => void): void;
      getBoundingBox(): geo.Rect | null;
      addEventListener(type: string, handler: Function): void;
    }

    namespace layer {
      class TileLayer {
        constructor(provider: any, options?: any);
      }
      class ObjectLayer {
        constructor(provider: any, options?: any);
      }
    }

    namespace provider {
      class ImageTileProvider {
        constructor(options: {
          label?: string;
          min?: number;
          max?: number;
          getURL: (col: number, row: number, level: number) => string;
          crossOrigin?: boolean | string;
          tileSize?: number;
        });
      }
    }

    class Polyline {
      constructor(strip: geo.LineString | geo.MultiLineString, options?: {
        style?: {
          strokeColor?: string;
          lineWidth?: number;
          lineCap?: string;
          lineJoin?: string;
          lineDash?: number[];
          fillColor?: string;
        };
        zIndex?: number;
      });
      setGeometry(strip: geo.LineString): void;
      getGeometry(): geo.LineString;
      setStyle(style: any): void;
    }

    class Marker {
      constructor(position: { lat: number; lng: number }, options?: {
        icon?: Icon;
        zIndex?: number;
        volatility?: boolean;
      });
      setGeometry(point: { lat: number; lng: number }): void;
      getGeometry(): { lat: number; lng: number };
      draggable: boolean;
      setIcon(icon: Icon): void;
    }

    class DomMarker {
      constructor(position: { lat: number; lng: number }, options?: {
        icon?: DomIcon;
        zIndex?: number;
      });
      setGeometry(point: { lat: number; lng: number }): void;
      getGeometry(): { lat: number; lng: number };
      setIcon(icon: DomIcon): void;
    }

    class Icon {
      constructor(content: string | HTMLElement, options?: {
        size?: { w: number; h: number };
        anchor?: { x: number; y: number };
        crossOrigin?: boolean;
      });
    }

    class DomIcon {
      constructor(element: HTMLElement | string, options?: {
        onAttach?: (clonedElement: HTMLElement, domIcon: DomIcon, domMarker: DomMarker) => void;
        onDetach?: (clonedElement: HTMLElement, domIcon: DomIcon, domMarker: DomMarker) => void;
      });
    }
  }

  namespace geo {
    class LineString {
      constructor(values?: number[], encoding?: string);
      pushPoint(point: { lat: number; lng: number }): void;
      pushLatLngAlt(lat: number, lng: number, alt?: number): void;
      getPointCount(): number;
      extractPoint(index: number): { lat: number; lng: number };
      static fromFlexiblePolyline(encoded: string): LineString;
    }

    class MultiLineString {
      constructor(lineStrings: LineString[]);
    }

    class Rect {
      constructor(top: number, left: number, bottom: number, right: number);
      getTop(): number;
      getLeft(): number;
      getBottom(): number;
      getRight(): number;
      getCenter(): { lat: number; lng: number };
      containsPoint(point: { lat: number; lng: number }): boolean;
      mergeRect(rect: Rect): Rect;
    }

    class Point {
      constructor(lat: number, lng: number, alt?: number);
      lat: number;
      lng: number;
    }
  }

  namespace mapevents {
    class Behavior {
      constructor(events: MapEvents, options?: any);
      disable(feature?: number): void;
      enable(feature?: number): void;
    }
    class MapEvents {
      constructor(map: H.Map);
    }
  }

  namespace ui {
    class UI {
      static createDefault(map: H.Map, layers: any, locale?: string): UI;
      addControl(name: string, control: any): void;
      removeControl(name: string): void;
      getControl(name: string): any;
      getBubbles(): any[];
      removeBubble(bubble: any): void;
    }
  }

  namespace clustering {
    class Provider {
      constructor(dataPoints: DataPoint[], options?: {
        clusteringOptions?: { eps?: number; minWeight?: number; strategy?: any };
        theme?: {
          getClusterPresentation: (cluster: any) => any;
          getNoisePresentation: (noisePoint: any) => any;
        };
        min?: number;
        max?: number;
      });
      setDataPoints(dataPoints: DataPoint[]): void;
      getLayer(): any;
      addEventListener(type: string, handler: Function): void;
      removeEventListener(type: string, handler: Function): void;
    }

    class DataPoint {
      constructor(lat: number, lng: number, weight?: number, data?: any);
      getPosition(): { lat: number; lng: number };
      getData(): any;
      getWeight(): number;
    }
  }
}
