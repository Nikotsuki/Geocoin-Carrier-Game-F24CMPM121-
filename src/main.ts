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
const knownCaches: Map<string, Cache> = new Map();
const playerCoinsCollection: Coin[] = [];
let watchId: number | null = null;
let geoToggle: boolean = false;
let playerPath: leaflet.LatLng[] = [];
let currentLocation = leaflet.latLng(start[0], start[1]);
let playerCoins = 0;

//create map
const map = leaflet.map(document.getElementById("map")!, {
  center: currentLocation,
  zoom: zoom,
  minZoom: zoom,
  maxZoom: zoom,
  zoomControl: false,
  scrollWheelZoom: false,
});

const polyPath = leaflet.polyline(playerPath, {
  color: "red",
  weight: 4,
}).addTo(map);

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
playerStatus.innerHTML = "No coins yet...";

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

//starter cache class with memento implementation
class Cache implements Memento<string> {
  i: number;
  j: number;
  coinsArray: Coin[];
  rect: leaflet.Rectangle;
  amount: number;

  constructor(
    i: number,
    j: number,
    coinsArray: Coin[],
    rect: leaflet.Rectangle,
    amount: number,
  ) {
    this.i = i;
    this.j = j;
    this.coinsArray = coinsArray;
    this.rect = rect;
    this.amount = amount;
  }

  toMemento(): string {
    return JSON.stringify(this.coinsArray);
  }

  fromMemento(memento: string): void {
    this.coinsArray = JSON.parse(memento);
  }
}

//function to set caches visisble or invisible
function setVisible(cache: Cache, visible: boolean) {
  if (visible) {
    cache.rect.addTo(map);
  } else {
    map.removeLayer(cache.rect);
  }
}

//find nearby cells and spawn caches
function regenCaches() {
  const nearbyCells = board.getCellsNearPoint(currentLocation);
  for (const cell of nearbyCells) {
    const key = cell.toString();
    if (
      !knownCaches.has(key) &&
      luck([cell.i, cell.j].toString()) < cacheProbability
    ) {
      spawnCache(cell.i, cell.j);
    }
  }
  saveGame();
}

regenCaches();

//spawn caches and handle popups
function spawnCache(i: number, j: number) {
  const newCell: Cell = { i, j };
  const cacheCell = board.getCanonicalCell(newCell);
  const key = [i, j].toString();
  //if cache already exists, return
  if (knownCaches.has(key)) {
    setVisible(knownCaches.get(key)!, true);
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
    coinsNumber,
  );

  //store key with cache memento of coin array
  cacheStorage.set(key, cache.toMemento());
  //store key with cache object
  knownCaches.set(key, cache);
  handleCachePopup(cache, key);
}

function handleCachePopup(cache: Cache, key: string) {
  cache.rect.bindPopup(() => {
    const popupDiv = document.createElement("div");

    const ulElement = document.createElement("ul");

    //create string list of coins
    cache.coinsArray.forEach((coin) => {
      const liElement = document.createElement("li");
      liElement.textContent = `Coin ID:${coin.i}:${coin.j}#${coin.serial}`;
      ulElement.appendChild(liElement);
    });

    popupDiv.innerHTML = `
      <div>This cache at "${cache.i},${cache.j}" has <span id="value">${cache.amount}</span> coins.</div>
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
            playerCoinsCollection.push(collect);
            playerCoins++;
            cache.amount--;
            playerStatus.innerHTML = `You have ${playerCoins} coins`;
            cacheStorage.set(key, cache.toMemento());
            //update list of coins
            cache.coinsArray.forEach((coin) => {
              const liElement = document.createElement("li");
              liElement.textContent =
                `Coin ID:${coin.i}:${coin.j}#${coin.serial}`;
              ulElement.appendChild(liElement);
            });
          }
          saveGame();
        }
      });

    //deposit button event
    popupDiv.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerCoinsCollection.length > 0) {
          ulElement.textContent = "";
          const deposit = playerCoinsCollection.pop();
          if (deposit) {
            cache.coinsArray.push(deposit);
            playerCoins--;
            cache.amount++;
            playerStatus.innerHTML = `You have ${playerCoins} coins`;
            cacheStorage.set(key, cache.toMemento());
            //update list of coins
            cache.coinsArray.forEach((coin) => {
              const liElement = document.createElement("li");
              liElement.textContent =
                `Coin ID:${coin.i}:${coin.j}#${coin.serial}`;
              ulElement.appendChild(liElement);
            });
          }
          saveGame();
        }
      });
    return popupDiv;
  });
}

function toggleGeoLocation() {
  if (!geoToggle) {
    geoToggle = true;
    watchId = navigator.geolocation.watchPosition((position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      currentLocation = leaflet.latLng(latitude, longitude);
      playerMarker.setLatLng(currentLocation);
      map.panTo(currentLocation);
      regenCaches();
    }, (error) => {
      console.error("Error code: " + error.code + ". " + error.message);
    }, {
      enableHighAccuracy: true,
    });
  } else {
    geoToggle = false;
    navigator.geolocation.clearWatch(watchId!);
    currentLocation = leaflet.latLng(start[0], start[1]);
    playerMarker.setLatLng(currentLocation);
    map.panTo(currentLocation);
    regenCaches();
  }
}

//removes all rectangles from board
function clearBoard() {
  knownCaches.forEach((cache) => {
    setVisible(cache, false);
  });
}

//moves the player
function movePlayer(i: number, j: number) {
  let { lat, lng } = playerMarker.getLatLng();
  lat += i;
  lng += j;
  playerMarker.setLatLng([lat, lng]);
  currentLocation = leaflet.latLng(lat, lng);
  map.panTo(currentLocation);
  playerPath.push(currentLocation);
  polyPath.setLatLngs(playerPath);
  saveGame();
}

document.getElementById("north")?.addEventListener("click", () => {
  movePlayer(cellWidth, 0);
  clearBoard();
  regenCaches();
});

document.getElementById("south")?.addEventListener("click", () => {
  movePlayer(-cellWidth, 0);
  clearBoard();
  regenCaches();
});

document.getElementById("east")?.addEventListener("click", () => {
  movePlayer(0, cellWidth);
  clearBoard();
  regenCaches();
});

document.getElementById("west")?.addEventListener("click", () => {
  movePlayer(0, -cellWidth);
  clearBoard();
  regenCaches();
});

document.getElementById("reset")?.addEventListener("click", () => {
  reset();
});

const geoButton = document.getElementById(
  "toggleGeolocation",
) as HTMLButtonElement;
geoButton.addEventListener("click", () => {
  if (!geoToggle) {
    geoButton.style.background = "gray";
  } else {
    geoButton.style.background = "black";
  }
  toggleGeoLocation();
});

function saveGame() {
  localStorage.setItem("playerCoins", JSON.stringify(playerCoins));
  localStorage.setItem(
    "playerCoinsCollection",
    JSON.stringify(playerCoinsCollection),
  );
  localStorage.setItem(
    "playerLocation",
    JSON.stringify({
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
    }),
  );
  localStorage.setItem(
    "playerPath",
    JSON.stringify(playerPath.map((point) => ({
      latitude: point.lat,
      longitude: point.lng,
    }))),
  );
  localStorage.setItem(
    "playerPath",
    JSON.stringify(
      playerPath.map((point) => ({ lat: point.lat, lng: point.lng })),
    ),
  );
  localStorage.setItem("cacheStorage", JSON.stringify(cacheStorage));
}

function loadGame() {
  const location = localStorage.getItem("playerLocation");
  if (location) {
    const { latitude, longitude } = JSON.parse(location);
    currentLocation = leaflet.latLng(latitude, longitude);
    playerMarker.setLatLng(currentLocation);
    map.panTo(currentLocation);
  }

  const coinsNumber = localStorage.getItem("playerCoins");
  if (coinsNumber) {
    playerCoins = JSON.parse(coinsNumber);
    playerStatus.innerHTML = `You have ${coinsNumber} coins`;
  }

  const playerCollection = localStorage.getItem("playerCoinsCollection");
  if (playerCollection) {
    playerCoinsCollection.length = 0;
    playerCoinsCollection.push(JSON.parse(playerCollection));
  }

  const caches = localStorage.getItem("cacheStorage");
  if (caches) {
    const cachesData = JSON.parse(caches);
    console.log(cachesData);
    for (const [key, coins] of cachesData) {
      const [i, j] = key.split(",").map(Number);
      const rect = leaflet.rectangle(board.getCellBounds({ i, j }));
      rect.addTo(map);
      const cache = new Cache(i, j, [], rect, 0);
      cache.fromMemento(coins as string);
      cache.amount = cache.coinsArray.length;
      handleCachePopup(cache, key);
      knownCaches.set(key, cache);
      cacheStorage.set(key, coins as string);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadGame();
});

function reset() {
  const confirmation = prompt("Are you sure you want to reset?");
  if (confirmation?.toLowerCase() === "yes") {
    clearBoard();
    playerMarker.setLatLng(start);
    currentLocation = leaflet.latLng(36.98949379578401, -122.06277128548504);
    playerCoins = 0;
    map.panTo(start);
    playerPath = [];
    polyPath.setLatLngs([]);
    playerStatus.innerHTML = `You have ${playerCoins} coins`;
    cacheStorage.clear();
    knownCaches.clear();
    regenCaches();
  }
}
