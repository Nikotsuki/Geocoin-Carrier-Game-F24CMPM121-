import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board } from "./board.ts";

// variables
const start = leaflet.latLng(36.98949379578401, -122.06277128548504);
const zoom = 19;
const cellWidth = 0.0001;
const cacheRadius = 8;
const cacheProbability = 0.09;
const playerStatus: HTMLDivElement = document.querySelector("#statusElement")!;
const playerMarker = leaflet.marker(start);
const _board = new Board(cellWidth, cacheRadius);
let points = 0;
let spawn;

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
  serial: string;
}

class _Cache {
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
      spawn = spawnCache(i, j);
      popups(i, j, spawn);
    }
  }
}

//create rectangle for cache and return it
function spawnCache(i: number, j: number) {
  const bounds = leaflet.latLngBounds([
    [start.lat + i * cellWidth, start.lng + j * cellWidth],
    [start.lat + (i + 0.7) * cellWidth, start.lng + (j + 0.7) * cellWidth],
  ]);
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  return rect;
}

//handle events and text for each cache
function popups(i: number, j: number, spawn: leaflet) {
  spawn.bindPopup(() => {
    let cacheValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
    const popupDiv = document.createElement("div");
    const value = popupDiv.querySelector<HTMLSpanElement>("#value")!;
    popupDiv.innerHTML = `
      <div>This cache at "${i},${j}" has a value of <span id="value">${cacheValue}</span>.</div>
      <button id="collect" style="background-color: white">collect</button>
      <button id="deposit" style="background-color: white">deposit</button>`;

    //collect button event
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        cacheValue--;
        value.innerHTML = cacheValue.toString();
        points++;
        playerStatus.innerHTML = `You have ${points} points`;
      });

    //deposit button event
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        cacheValue++;
        value.innerHTML = cacheValue.toString();
        points--;
        playerStatus.innerHTML = `You have ${points} points`;
      });

    return popupDiv;
  });
}
