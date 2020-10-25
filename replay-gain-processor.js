/*
    AudioWorklet modification of LiveEV algorithm found https://github.com/SebastianZimmer/LoudEv implementing an approximation of ReplayGain 2.0
*/

class ReplayGainProcessor extends AudioWorkletProcessor {
    totalSamples = 0;
    totalLoudness = 0.0;
    lastGain = 1;
    coeff = 0;
    constructor() {
        super();
        // Setup values for attack/release envelope
        // Time in ms
        var envelopeTime = 2000;
        // Sample rate comes from AudioWorkletGlobalScope
        var timeconstant = envelopeTime * sampleRate * 0.001;
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
            var sampleAvg = sum / inputData.length;
            this.totalSamples++;
            // Bound loudness to try to better compensate for silence/really quiet parts at the beginning of a video
            this.totalLoudness += Math.min(-1, Math.max(-28, sampleAvg));
            var avgLoudness = (this.totalLoudness / this.totalSamples);
            var rg = -14 - avgLoudness;
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
        return true;
    }

    reset() {
        this.totalLoudness = 0.0;
        this.totalSamples = 0;
        this.lastGain = 1;
    }
}
  
  registerProcessor('replay-gain-processor', ReplayGainProcessor);
  