var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var videoElements = document.getElementsByTagName("video");
if (videoElements.length < 0) {
    // Handle off chance that this script is loaded before the video element (shouldn't happen (?))
    console.log("video not loaded");
} else {
    var audioSrc = audioCtx.createMediaElementSource(videoElements[0]);
    var url = chrome.runtime.getURL('replay-gain-processor.js');
    audioCtx.audioWorklet.addModule(url).then(() => {
        const replayGainNode = new AudioWorkletNode(audioCtx, "replay-gain-processor");
        audioSrc.connect(replayGainNode);
        replayGainNode.connect(audioCtx.destination);
    }).catch((e) => console.log(e));
}
