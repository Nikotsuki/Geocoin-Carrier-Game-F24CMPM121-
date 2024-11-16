import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board } from "./board.ts";
import { Cell } from "./board.ts";

// variables
const start = [36.98949379578401, -122.06277128548504];
const zoom = 19;
const cellWidth = 0.0001;
const cacheRadius = 8;
const cacheProbability = 0.09;
const playerStatus: HTMLDivElement = document.querySelector("#statusElement")!;
const playerMarker = leaflet.marker(start);
const board = new Board(cellWidth, cacheRadius);
const cacheStorage: Map<string, string> = new Map();
const cacheMap: Map<string, Cache> = new Map();
const playerCoins: Coin[] = [];
const currentLocation = leaflet.latLng(start[0], start[1]);
let playerPoints = 0;

//create map
const map = leaflet.map(document.getElementById("map")!, {
  center: currentLocation,
  zoom: zoom,
  minZoom: zoom,
  maxZoom: zoom,
  zoomControl: false,
  scrollWheelZoom: false,
});

// create leaflet (from example)
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: zoom,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

//player marker
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);
playerStatus.innerHTML = "No points yet...";

//basic coin interface
interface Coin {
  i: number;
  j: number;
  serial: number;
}

//mementos interface
interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

//starter cache class
class Cache implements Memento<string> {
  i: number;
  j: number;
  coinsArray: Coin[];
  rect: leaflet.Rectangle;

  constructor(
    i: number,
    j: number,
    coinsArray: Coin[],
    rect: leaflet.Rectangle,
  ) {
    this.i = i;
    this.j = j;
    this.coinsArray = coinsArray;
    this.rect = rect;
  }

  toMemento(): string {
    return JSON.stringify(this.coinsArray);
  }

  fromMemento(memento: string): void {
    this.coinsArray = JSON.parse(memento);
  }
}

//find nearby cells and spawn caches
function regenCells() {
  const nearbyCells = board.getCellsNearPoint(start);
  for (const cell of nearbyCells) {
    const key = cell.toString();
    if (
      !cacheStorage.has(key) &&
      luck([cell.i, cell.j].toString()) < cacheProbability
    ) {
      spawnCache(cell.i, cell.j);
    }
  }
}

regenCells();

//spawn caches and handle popups
function spawnCache(i: number, j: number) {
  const newCell: Cell = { i, j };
  const cacheCell = board.getCanonicalCell(newCell);
  const key = [i, j].toString();
  //if cache already exists, return
  if (cacheStorage.has(key)) {
    return;
  }
  //create rectangle
  const cacheLocation = board.getCellBounds(cacheCell);
  const rect = leaflet.rectangle(cacheLocation);
  rect.addTo(map);

  const coinsNumber = Math.floor(luck([i, j, "initialValue"].toString()) * 30);

  //create array of coins
  const coinsArray: Coin[] = [];
  for (let serial = 0; serial < coinsNumber; serial++) {
    const coin: Coin = { i: cacheCell.i, j: cacheCell.j, serial: serial };
    coinsArray.push(coin);
  }

  //create new cache object
  const cache = new Cache(
    cacheCell.i,
    cacheCell.j,
    coinsArray,
    rect,
  );

  //store cache data in maps
  cacheStorage.set(key, cache.coinsArray.toString());
  cacheMap.set(key, cache);

  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");

    const ulElement = document.createElement("ul");

    //create string list of coins
    cache.coinsArray.forEach((coin) => {
      const liElement = document.createElement("li");
      liElement.textContent = `Coin ID:${coin.i}:${coin.j}#${coin.serial}`;
      ulElement.appendChild(liElement);
    });

    popupDiv.innerHTML = `
    <div>This cache at "${cache.i},${cache.j}" has <span id="value">${coinsNumber}</span> coins.</div>
    <button id="collect" style="background-color: white">collect</button>
    <button id="deposit" style="background-color: white">deposit</button>`;

    popupDiv.appendChild(ulElement);

    //collect button event
    popupDiv.querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (cache.coinsArray.length > 0) {
          ulElement.textContent = "";
          const collect = cache.coinsArray.shift();
          if (collect) {
            playerCoins.push(collect);
            playerPoints++;
            playerStatus.innerHTML = `You have ${playerPoints} coins`;
            cacheStorage.set(key, cache.coinsArray.toString());
            //update list of coins
            cache.coinsArray.forEach((coin) => {
              const liElement = document.createElement("li");
              liElement.textContent =
                `Coin ID:${coin.i}:${coin.j}#${coin.serial}`;
              ulElement.appendChild(liElement);
            });
          }
        }
      });

    //deposit button event
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerCoins.length > 0) {
          ulElement.textContent = "";
          const deposit = playerCoins.pop();
          if (deposit) {
            cache.coinsArray.push(deposit);
            playerPoints--;
            playerStatus.innerHTML = `You have ${playerPoints} coins`;
            cacheStorage.set(key, cache.toMemento());
            //update list of coins
            cache.coinsArray.forEach((coin) => {
              const liElement = document.createElement("li");
              liElement.textContent =
                `Coin ID:${coin.i}:${coin.j}#${coin.serial}`;
              ulElement.appendChild(liElement);
            });
          }
        }
      });
    return popupDiv;
  });

  document.getElementById("north")?.addEventListener("click", () => {
    currentLocation.lat += cellWidth;
    playerMarker.setLatLng(currentLocation);
    //saveAndClear();
    regenCells();
  });

  document.getElementById("south")?.addEventListener("click", () => {
    currentLocation.lat -= cellWidth;
    playerMarker.setLatLng(currentLocation);
    //saveAndClear();
    regenCells();
  });

  document.getElementById("east")?.addEventListener("click", () => {
    currentLocation.lng += cellWidth;
    playerMarker.setLatLng(currentLocation);
    //saveAndClear();
    regenCells();
  });

  document.getElementById("west")?.addEventListener("click", () => {
    currentLocation.lng -= cellWidth;
    playerMarker.setLatLng(currentLocation);
    //saveAndClear();
    regenCells();
  });
}
