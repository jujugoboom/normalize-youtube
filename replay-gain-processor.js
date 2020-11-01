/*
    AudioWorklet modification of LiveEV algorithm found https://github.com/SebastianZimmer/LoudEv implementing an approximation of ReplayGain 2.0
*/

class ReplayGainProcessor extends AudioWorkletProcessor {
    totalSamples = 0;
    avgLoudness = 0.0;
    lastGain = 1;
    coeff = 0;
    constructor() {
        super();
        // Setup values for attack/release envelope
        // Time in ms
        var envelopeTime = 10000;
        // Sample rate comes from AudioWorkletGlobalScope
        var timeconstant = envelopeTime * (sampleRate / 128) * 0.001;
        console.log(timeconstant);
        this.coeff = (1.0 / 0.001) ** (-1.0 / timeconstant);
        this.port.onmessage = (m) => {
            if (m.data.reset) {
                this.reset();
            }
        }
    }
    applyGain(input, outputs, gain) {
        for (var channel = 0; channel < outputs.length; channel++) {
            var outputData = outputs[channel];
            for (var i = 0; i < input.length; i++) {
                // Apply gain value and try to avoid clipping
                outputData[i] = Math.max(-1, Math.min(1, input[i] * gain));
            }
        }
    }
    process(inputs, outputs, parameters) {
        var inputBuffer = inputs[0];
    
        var outputBuffer = outputs[0];
        
        var inputData = inputBuffer[0];
    
        var sum = 0.0;
        for (var i = 0; i < inputData.length; i++) {
            sum += -0.691 + (10 * Math.log10(inputData[i]));
        }
        var gain;
        if(isFinite(sum)) {
            // Bound loudness to try to better compensate for silence/really quiet parts at the beginning of a video
            var sampleAvg = Math.min(-1, Math.max(-28, sum / inputData.length));
            this.totalSamples++;
            // Use EMA with factor of 1000 with totalSamples for warmup
            this.avgLoudness = this.avgLoudness + (sampleAvg - this.avgLoudness) / Math.min(this.totalSamples, 1000);
            var rg = -14 - this.avgLoudness;
            var newGain = 10 ** (rg/20);
            // Apply attack/release envelope
            gain = ( this.coeff * this.lastGain ) + ( ( 1.0 - this.coeff ) * newGain );
        }
        else {
            gain = 1;
        }
        var audioInput = inputBuffer[1];
        this.applyGain(audioInput, outputBuffer, gain);
        this.lastGain = gain;
        if(this.totalSamples % 375 === 0) {
            // Send stats update every second (based on 44.1khz sample rate and frame size of 128)
            this.port.postMessage({currentGain: this.lastGain, currentLoudness: this.avgLoudness});
        }
        return true;
    }

    reset() {
        this.avgLoudness = 0.0;
        this.totalSamples = 0;
        this.lastGain = 1;
    }
}
  
  registerProcessor('replay-gain-processor', ReplayGainProcessor);
  