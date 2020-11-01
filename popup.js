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

gainElement = document.getElementById("current-gain");
loudnessElement = document.getElementById("average-loudness");
timeElement = document.getElementById("sample-time");
chrome.storage.local.get("currentGain", (g) => {
    if(g.currentGain) {
        gainElement.innerText = g.currentGain;
    }
});
chrome.storage.local.get("currentLoudness", (l) => {
    if (l.currentLoudness) {
        loudnessElement.innerText = l.currentLoudness;
    }
});
setInterval(() => {
    // Update stats in popup every second
    chrome.storage.local.get("currentGain", (g) => {
        if(g.currentGain) {
            gainElement.innerText = g.currentGain;
        }
    });
    chrome.storage.local.get("currentLoudness", (l) => {
        if (l.currentLoudness) {
            loudnessElement.innerText = l.currentLoudness;
        }
    });
}, 1000);

updateButton();