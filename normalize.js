
/*
    Attempt at realtime normalization using ReplayGain 2.0 and calculating LUFS based on algorithm found at https://github.com/SebastianZimmer/LoudEv
*/
chrome.storage.sync.get("enabled", (e) => {if (e.enabled) normalizeVideo()});

let setupAudioPipeline = (videoElement) => {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var audioSrc = audioCtx.createMediaElementSource(videoElement);
    createEBUBuffer(audioCtx, audioSrc).then((ebuBuffer) => {
        var url = chrome.runtime.getURL('replay-gain-processor.js');
        audioCtx.audioWorklet.addModule(url).then(() => {
        const replayGainNode = new AudioWorkletNode(audioCtx, "replay-gain-processor");
        //Put original audio in its own channel to be modified by ReplayGain
        var audio_data_merger = audioCtx.createChannelMerger(2);
        ebuBuffer.connect(audio_data_merger, 0, 0);
        audioSrc.connect(audio_data_merger, 0, 1);
        audio_data_merger.connect(replayGainNode);
        replayGainNode.connect(audioCtx.destination);
        // Youtube only changes src when choosing new video from sidebar
        var observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if(mutation.type === "attributes" && mutation.attributeName === "src"){
                    replayGainNode.port.postMessage({reset: true});
                }
            })
        })
        observer.observe(videoElement, {attributes: true})
    }).catch((e) => console.log(e));
    });

    audioSrc.mediaElement.onpause = () => {
        audioCtx.suspend();
    }

    audioSrc.mediaElement.onplay = () => {
        audioCtx.resume();
    }
}

let normalizeVideo = () => {
    var videoElements = document.getElementsByTagName("video");
    if (videoElements.length < 0) {
        // Handle off chance that this script is loaded before the video element (shouldn't happen (?))
        console.error("video not loaded");
    } else {
        var videoElement = videoElements[0];
        setupAudioPipeline(videoElement);
    }
}
