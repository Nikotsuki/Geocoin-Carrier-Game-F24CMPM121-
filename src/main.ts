import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

// variables
const start = leaflet.latLng(36.98949379578401, -122.06277128548504);
const cellWidth = 0.0001;
const cacheRadius = 8;
const cacheProbability = 0.09;
const playerStatus: HTMLDivElement = document.querySelector("#statusElement")!;
const playerMarker = leaflet.marker(start);
let points = 0;
let spawn;

//create map
const map = leaflet.map(document.querySelector("#map")!, {
  center: start,
});

// create leaflet (from example)
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

//player marker
playerMarker.bindTooltip("You are here");
playerMarker.addTo(map);
playerStatus.innerHTML = "No points yet...";

//choose a cell to spawna cache
for (let i = -cacheRadius; i < cacheRadius; i++) {
  for (let j = -cacheRadius; j < cacheRadius; j++) {
    if (luck([i, j].toString()) < cacheProbability) {
      spawn = spawnCache(i, j);
      popups(i, j, spawn);
    }
  }
}

//spawn cache
function spawnCache(i: number, j: number) {
  const bounds = leaflet.latLngBounds([
    [start.lat + i * cellWidth, start.lng + j * cellWidth],
    [start.lat + (i + 1) * cellWidth, start.lng + (j + 1) * cellWidth],
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
    popupDiv.innerHTML = `
                <div>This cache at "${i},${j}" has a value of <span id="value">${cacheValue}</span>.</div>
                <button id="collect" style="background-color: white">collect</button>
                <button id="deposit" style="background-color: white">deposit</button>`;

    //collect button
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        cacheValue--;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          cacheValue.toString();
        points++;
        playerStatus.innerHTML = `You have ${points} points`;
      });

    //deposit button
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        cacheValue++;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          cacheValue.toString();
        points--;
        playerStatus.innerHTML = `You have ${points} points`;
      });

    return popupDiv;
  });
}
