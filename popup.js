let powerButton = document.getElementById("power-icon");

let isEnabled;
let updateButton = () => {
    chrome.storage.sync.get("enabled", (e) => {
        isEnabled = e.enabled;
        powerButton.style.fill = isEnabled ? "green" : "gray";
    })
}

powerButton.onclick = () => {
    chrome.storage.sync.set({enabled: !isEnabled}, () => {});
    updateButton();
}

updateButton();