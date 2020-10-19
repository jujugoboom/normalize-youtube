/*
    AudioWorklet modification of LiveEV algorithm found https://github.com/SebastianZimmer/LoudEv implementing an approximation of ReplayGain 2.0
*/

class ReplayGainProcessor extends AudioWorkletProcessor {
    //Maintain a buffer of sums to average out over the suggested ~50ms for ReplayGain
    sumBuffer = []
    peakLevelBuffer = []
    constructor() {
      // The super constructor call is required.
      super();
    }
  
    process(inputs, outputs, parameters) {
        var inputBuffer = inputs[0];
    
        var outputBuffer = outputs[0];
        
        var inputData = inputBuffer[0];
    
        var s = 0.0;
        for (var i = 0; i < inputData.length; i++) {
            s += -0.691 + (10 * Math.log10(inputData[i]));
        }
        const sumCallback = (acc, curr) => acc + curr;
        this.sumBuffer.push(s);
        if (s / inputData.length > -14) {
            var audioInput = inputBuffer[1];
            for (var channel = 0; channel < outputBuffer.length; channel++) {
                var outputData = outputBuffer[channel];
                for (var i = 0; i < audioInput.length; i++) {
                    outputData[i] = audioInput[i]
                }
            }
            return true;
        }
        var sum = this.sumBuffer.reduce(sumCallback);
        var avgLoudness = sum / (this.sumBuffer.length * inputData.length);
        if(this.sumBuffer.length > 1000) {
            // Moving window buffer
            this.sumBuffer.shift()
        }
        var rg = -14 - avgLoudness;
        var gain = 10 ** (rg/20);
        if (rg === -Infinity) {
            gain = 1;
        }
        gain = Math.max(gain, 0.02);
        gain = Math.min(gain, 5);
        var audioInput = inputBuffer[1];
        // console.log("Loudness/gain", avgLoudness, gain)
        for (var channel = 0; channel < outputBuffer.length; channel++) {
            var outputData = outputBuffer[channel];
            for (var i = 0; i < audioInput.length; i++) {
                outputData[i] = audioInput[i] * gain;
            }
        }
        return true;
    }
}
  
  registerProcessor('replay-gain-processor', ReplayGainProcessor);
  