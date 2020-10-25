/*
    MIT License

    Copyright (c) 2020 Sebastian Zimmer

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/


// Setup audio pipeline for LUFS calculation
async function createEBUBuffer(audioCtx, audioSrc) {
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
    await fetch(chrome.runtime.getURL("3sec-1-mono_44100.wav"))
    .then(r => r.arrayBuffer())
    .then(b => audioCtx.decodeAudioData(b))
    .then(audioBuffer => {
        ebu_convolver_L.buffer = audioBuffer;
        ebu_convolver_R.buffer = audioBuffer;
    });
    audioSrc.connect(ebu_splitter);
    return ebu_channel_summing_gain;
}