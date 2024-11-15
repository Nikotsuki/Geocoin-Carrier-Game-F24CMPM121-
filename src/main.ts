import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board } from "./board.ts";
import { Cell } from "./board.ts";

// variables
const start = leaflet.latLng(36.98949379578401, -122.06277128548504);
const zoom = 19;
const cellWidth = 0.0001;
const cacheRadius = 8;
const cacheProbability = 0.09;
const playerStatus: HTMLDivElement = document.querySelector("#statusElement")!;
const playerMarker = leaflet.marker(start);
const board = new Board(cellWidth, cacheRadius);
//const cacheStorage: Map<string, string> = new Map();
const cacheMap: Map<string, Cache> = new Map();
const playerCoins: Coin[] = [];
let playerPoints = 0;

//create map
const map = leaflet.map(document.getElementById("map")!, {
  center: start,
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

interface Coin {
  i: number;
  j: number;
  serial: number;
}

class Cache {
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
}

//choose a cell to spawn a cache at random
for (let i = -cacheRadius; i < cacheRadius; i++) {
  for (let j = -cacheRadius; j < cacheRadius; j++) {
    if (luck([i, j].toString()) < cacheProbability) {
      console.log("this is i,j = " + i + "," + j);
      spawnCache(i, j);
    }
  }
}

//create rectangle for cache and return it
function spawnCache(i: number, j: number) {
  const newCell: Cell = { i, j };
  const cacheCell = board.getCanonicalCell(newCell);
  console.log(cacheCell);
  const key = [i, j].toString();
  if (cacheMap.has(key)) {
    return;
  }
  const cacheLocation = board.getCellBounds(cacheCell);
  console.log(cacheLocation);
  const rect = leaflet.rectangle(cacheLocation);
  rect.addTo(map);

  const coinsNumber = Math.floor(luck([i, j, "initialValue"].toString()) * 30);

  const coinsArray: Coin[] = [];
  for (let serial = 0; serial < coinsNumber; serial++) {
    const coin: Coin = { i: cacheCell.i, j: cacheCell.j, serial: serial };
    coinsArray.push(coin);
  }

  const cache = new Cache(
    cacheCell.i,
    cacheCell.j,
    coinsArray,
    rect,
  );

  //cacheStorage.set(key, cache.coinsArray.toString());
  cacheMap.set(key, cache);

  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    const value = popupDiv.querySelector<HTMLSpanElement>("#value")!;
    popupDiv.innerHTML = `
    <div>This cache at "${i},${j}" has a value of <span id="value">${coinsNumber}</span>.</div>
    <button id="collect" style="background-color: white">collect</button>
    <button id="deposit" style="background-color: white">deposit</button>`;

    //collect button event
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (cache.coinsArray.length > 0) {
          const collect = cache.coinsArray.shift();
          if (collect) {
            playerCoins.push(collect);
            value.innerHTML = coinsNumber.toString();
            playerPoints++;
            playerStatus.innerHTML = `You have ${playerPoints} coins`;
            //cacheStorage.set(key, cache.coinsArray.toString());
          }
        }
      });

    //deposit button event
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerCoins.length > 0) {
          const deposit = playerCoins.shift();
          if (deposit) {
            cache.coinsArray.push(deposit);
            value.innerHTML = coinsNumber.toString();
            playerPoints--;
            playerStatus.innerHTML = `You have ${playerPoints} points`;
            //cacheStorage.set(key, cache.coinsArray.toString());
          }
        }
      });
    return popupDiv;
  });
}
