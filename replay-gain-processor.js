/*
    AudioWorklet modification of LiveEV algorithm found https://github.com/SebastianZimmer/LoudEv implementing an approximation of ReplayGain 2.0
*/

class ReplayGainProcessor extends AudioWorkletProcessor {
    totalSamples = 0;
    totalLoudness = 0.0;
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
            this.totalLoudness += sampleAvg;
            var avgLoudness = (this.totalLoudness / this.totalSamples);
            var rg = -14 - avgLoudness;
            var gain = 10 ** (rg/20);
            gain = Math.max(gain, 0.02);
            gain = Math.min(gain, 5);
        }
        else {
            gain = 1;
        }
        var audioInput = inputBuffer[1];
        for (var channel = 0; channel < outputBuffer.length; channel++) {
            var outputData = outputBuffer[channel];
            for (var i = 0; i < audioInput.length; i++) {
                // Apply gain value and try to avoid clipping
                outputData[i] = Math.max(-1, Math.min(1, audioInput[i] * gain));
            }
        }
        return true;
    }
}
  
  registerProcessor('replay-gain-processor', ReplayGainProcessor);
  