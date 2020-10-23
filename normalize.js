
/*
    Attempt at realtime normalization using ReplayGain 2.0 and calculating LUFS based on algorithm found at https://github.com/SebastianZimmer/LoudEv
*/

chrome.storage.sync.get("enabled", (e) => {if (e.enabled) normalizeVideo()});

let normalizeVideo = () => {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var videoElements = document.getElementsByTagName("video");
    if (videoElements.length < 0) {
        // Handle off chance that this script is loaded before the video element (shouldn't happen (?))
        console.log("video not loaded");
    } else {
        var audioSrc = audioCtx.createMediaElementSource(videoElements[0]);
        var ebu_splitter = audioCtx.createChannelSplitter(2);

        //first stage shelving filter
        var highshelf_filter_L = audioCtx.createBiquadFilter();
        highshelf_filter_L.type = "highshelf";
        highshelf_filter_L.Q.value = 1;
        highshelf_filter_L.frequency.value = 1500;
        highshelf_filter_L.gain.value = 4;

        var highshelf_filter_R = audioCtx.createBiquadFilter();
        highshelf_filter_R.type = "highshelf";
        highshelf_filter_R.Q.value = 1;
        highshelf_filter_R.frequency.value = 1500;  //deduced with IIRFilter.getFrequencyResponse
        highshelf_filter_R.gain.value = 4;

        // second stage highpass filter
        var highpass_filter_L = audioCtx.createBiquadFilter();
        highpass_filter_L.frequency.value = 76;
        highpass_filter_L.Q.value = 1;
        highpass_filter_L.type = "highpass";

        var highpass_filter_R = audioCtx.createBiquadFilter();
        highpass_filter_R.frequency.value = 76;
        highpass_filter_R.Q.value = 1;
        highpass_filter_R.type = "highpass";

        //SQUARING EVERY CHANNEL
        var ebu_square_gain_L = audioCtx.createGain();
        ebu_square_gain_L.gain.value = 0;

        var ebu_square_gain_R = audioCtx.createGain();
        ebu_square_gain_R.gain.value = 0;

        var ebu_convolver_L = audioCtx.createConvolver();
        ebu_convolver_L.normalize = false;
        var ebu_convolver_R = audioCtx.createConvolver();
        ebu_convolver_R.normalize = false;

        var ebu_mean_gain_L = audioCtx.createGain();
        ebu_mean_gain_L.gain.value = 1/(audioCtx.sampleRate * 3);
        var ebu_mean_gain_R = audioCtx.createGain();
        ebu_mean_gain_R.gain.value = 1/(audioCtx.sampleRate * 3);

        var ebu_channel_summing_gain = audioCtx.createGain();
        //CONNECTING EBU GRAPH
        ebu_splitter.connect(highshelf_filter_L, 0, 0);
        ebu_splitter.connect(highshelf_filter_R, 1, 0);

        highshelf_filter_L.connect(highpass_filter_L);
        highshelf_filter_R.connect(highpass_filter_R);

        highpass_filter_L.connect(ebu_square_gain_L);
        highpass_filter_L.connect(ebu_square_gain_L.gain);

        highpass_filter_R.connect(ebu_square_gain_R);
        highpass_filter_R.connect(ebu_square_gain_R.gain);

        ebu_square_gain_L.connect(ebu_convolver_L).connect(ebu_mean_gain_L);
        ebu_square_gain_R.connect(ebu_convolver_R).connect(ebu_mean_gain_R);

        //Sum the signal
        ebu_mean_gain_L.connect(ebu_channel_summing_gain);
        ebu_mean_gain_R.connect(ebu_channel_summing_gain);

        fetch(chrome.runtime.getURL("3sec-1-mono_44100.wav"))
        .then(r => r.arrayBuffer())
        .then(b => audioCtx.decodeAudioData(b))
        .then(audioBuffer => {
            ebu_convolver_L.buffer = audioBuffer;
            ebu_convolver_R.buffer = audioBuffer;
        }).then(() => {
            var url = chrome.runtime.getURL('replay-gain-processor.js');
            audioCtx.audioWorklet.addModule(url).then(() => {
            const replayGainNode = new AudioWorkletNode(audioCtx, "replay-gain-processor");
            audioSrc.connect(ebu_splitter);
            var audio_data_merger = audioCtx.createChannelMerger(2);
            ebu_channel_summing_gain.connect(audio_data_merger, 0, 0);
            audioSrc.connect(audio_data_merger, 0, 1);
            audio_data_merger.connect(replayGainNode);
            replayGainNode.connect(audioCtx.destination);
        }).catch((e) => console.log(e));
        });

        audioSrc.mediaElement.onpause = () => {
            audioCtx.suspend();
        }

        audioSrc.mediaElement.onplay = () => {
            audioCtx.resume();
        }
    }
}
