/*
    AudioWorklet modification of ReplayGain algorithm found here https://github.com/est31/js-audio-normalizer

    More information can be found in the ReplayGain specification http://wiki.hydrogenaud.io/index.php?title=ReplayGain_specification

    Permission is hereby granted, free of charge, to any
    person obtaining a copy of this software and associated
    documentation files (the "Software"), to deal in the
    Software without restriction, including without
    limitation the rights to use, copy, modify, merge,
    publish, distribute, sublicense, and/or sell copies of
    the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice
    shall be included in all copies or substantial portions
    of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
    PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
    SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
    IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    DEALINGS IN THE SOFTWARE.
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
            s += inputData[i] ** 2;
        }
        const sumCallback = (acc, curr) => acc + curr;
        this.sumBuffer.push(s);
        var sum = this.sumBuffer.reduce(sumCallback);
        this.peakLevelBuffer.push(Math.sqrt(sum / (this.sumBuffer.length * inputData.length)));
        if(this.sumBuffer.length > 16) {
            // Shift buffer if it gets over 50ms of samples
            this.sumBuffer.shift()
        }
        var sortedPeakLevel = [...this.peakLevelBuffer].sort(function(a, b) { return a - b; });
        // Want to be able to react to large changes quickly, but not sure how (e.g. beginning of https://www.youtube.com/watch?v=ucZl6vQ_8Uo)
        // if (Math.abs(this.peakLevelBuffer[this.peakLevelBuffer.length - 1] - sortedPeakLevel[sortedPeakLevel.length - 1]) > this.peakLevelBuffer[this.peakLevelBuffer.length - 1]**2 && this.peakLevelBuffer.length > 600) {
        //     console.log("Clearing peak buffer");
        //     var last = this.peakLevelBuffer[this.peakLevelBuffer.length - 1];
        //     this.peakLevelBuffer = [last];
        //     sortedPeakLevel = [last];
        // }
        var a = sortedPeakLevel[Math.floor(sortedPeakLevel.length * 0.95)]
        if(this.peakLevelBuffer.length > 640) {
            this.peakLevelBuffer.shift()
        }
        var gain = 1.0 / a;
        gain = Math.max(gain, 0.02);
        gain = Math.min(gain, 100.0);
        gain = gain / 10.0;
        // console.log("A: ", a)
        for (var channel = 0; channel < outputBuffer.length; channel++) {
            var outputData = outputBuffer[channel];
            for (var i = 0; i < inputData.length; i++) {
                outputData[i] = inputData[i] * gain;
            }
        }
        return true;
    }
}
  
  registerProcessor('replay-gain-processor', ReplayGainProcessor);
  