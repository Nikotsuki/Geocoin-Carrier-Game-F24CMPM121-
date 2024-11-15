import leaflet from "leaflet";

export interface Cell {
  i: number;
  j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  private readonly knownCells: Map<string, Cell> = new Map();

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
  }

  getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();

    //if key not in konwnCells, add it
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    console.log(this.knownCells.get(key));
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    const southWest = new leaflet.LatLng(
      i * this.tileWidth,
      j * this.tileWidth,
    );
    const northEast = new leaflet.LatLng(
      (i + 1) * this.tileWidth,
      (j + 1) * this.tileWidth,
    );
    return new leaflet.LatLngBounds(southWest, northEast);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = -this.tileVisibilityRadius;
      i < this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j < this.tileVisibilityRadius;
        j++
      ) {
        resultCells.push(
          this.getCanonicalCell({ i: originCell.i + i, j: originCell.j + j }),
        );
      }
    }
    return resultCells;
  }
}
