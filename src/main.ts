// todo
const button: HTMLButtonElement = document.querySelector("#button")!;
const app: HTMLDivElement = document.querySelector("#app")!;


button.addEventListener("click", () => {
    app.innerHTML = "YOUCLICKEDME";
});