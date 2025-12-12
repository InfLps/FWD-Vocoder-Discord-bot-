/**
 * vocoderEngine.js
 * 
 * Implements a basic vocoder using the Web Audio API in a Node.js environment.
 * Processes modulator and carrier audio buffers to produce a vocoded output.
 */

import {
  OfflineAudioContext,
  BiquadFilterNode,
  GainNode,
  DynamicsCompressorNode
} from "node-web-audio-api";                                     // Simulated Web Audio API for Node.js

import decodeAudio from "audio-decode";                          // For decoding input audio buffers
import WavEncoder from "wav-encoder";                            // For encoding output to WAV format

// Main Vocoder Function
export async function runVocoder(modArrayBuf, carArrayBuf, widthPercent = 50) {
  const modDecoded = await decodeAudio(modArrayBuf);             // Decode modulator
  const carDecoded = await decodeAudio(carArrayBuf);             // Decode carrier

  // Determine processing duration based on shorter input
  const modDuration = modDecoded.length / modDecoded.sampleRate; // in seconds
  const carDuration = carDecoded.length / carDecoded.sampleRate; // in seconds
  const duration = Math.min(modDuration, carDuration);           // in seconds

  // Setup Offline Audio Context

  const WORK_RATE = 48000;                                       // <- Standardized processing rate
  const lengthSamples = Math.floor(duration * WORK_RATE);        // <- Total samples to process
  const ctx = new OfflineAudioContext(1, lengthSamples, WORK_RATE); // <- Mono output

  const modSourceNode = createBufferSource(ctx, modDecoded);     // Modulator Source
  const carSourceNode = createBufferSource(ctx, carDecoded);     // Carrier Source

  /* Map "Width" (0-100) to Q-Factor
   * 0% Width = Very Narrow filters (High Q ~ 15) -> Robotic, ringing
   * 100% Width = Wide filters (Low Q ~ 0.5) -> Noisy, full spectrum
   * Using a simple linear interpolation logic 
   */

  const minQ = 0.5;                                         // Wide
  const maxQ = 15;                                          // Narrow

  // Invert logic: High Width = Low Q
  const qFactor = maxQ - ((widthPercent / 100) * (maxQ - minQ)); // Calculate Q-Factor

  // Vocoder Bands
  const bands = 16; // Number of frequency bands
  const frequencies = logFrequencies(80, 7000, bands);      // Log-spaced frequencies from 80Hz to 7kHz
  const bandNodes = []; // Keep references to band nodes

  // Output Chain
  /* Summing Gain
   * Instead of reducing gain heavily, we keep it neutral (1.0)
   * because the filters remove so much energy, we actually lose volume. */

  const summingGain = new GainNode(ctx); // Summing bus for all bands
  summingGain.gain.value = 1.0;                             // Neutral gain

  // Compressor (Tames peaks)
  const compressor = new DynamicsCompressorNode(ctx, {
    threshold: -24,
    knee: 10,
    ratio: 12,
    attack: 0.003,
    release: 0.25
  });                                                       //<- Gentle compression

  // Makeup Gain (Restores Volume)
  // Since we filtered heavily, we need a significant boost.
  const makeupGain = new GainNode(ctx);
  makeupGain.gain.value = 4.0;                              // +12dB boost approximately

  // Soft Clipper / Limiter (Safety)
  // Prevents digital clipping from the makeup gain
  const limiter = ctx.createWaveShaper();                   // Soft clipper
  limiter.curve = getSoftClipCurve(WORK_RATE);              // Soft clipping curve

  // Wiring Output
  summingGain.connect(compressor);                          // -> Compressor
  compressor.connect(makeupGain);                           // -> Makeup Gain
  makeupGain.connect(limiter);                              // -> Soft Clipper
  limiter.connect(ctx.destination);                         // Final Output

  // Create Bands
  for (let f of frequencies) {
    // MODULATOR CHAIN
    const modFilter = new BiquadFilterNode(ctx, { type: "bandpass", frequency: f, Q: qFactor }); // Bandpass filter
    const rectifier = ctx.createWaveShaper();               // For full-wave rectification
    rectifier.curve = getAbsCurve();                        // Absolute value curve
    const envelope = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 40 }); // Slightly faster envelope

    // CARRIER CHAIN
    const carFilter = new BiquadFilterNode(ctx, { type: "bandpass", frequency: f, Q: qFactor });
    const bandGain = new GainNode(ctx);                     // Controls band volume
    bandGain.gain.value = 0;                                // Start muted, controlled by envelope

    // Wire Modulator
    modSourceNode.connect(modFilter);                       // Modulator to bandpass
    modFilter.connect(rectifier);
    rectifier.connect(envelope);
    
    // Envelope controls Carrier Band Volume
    envelope.connect(bandGain.gain); 

    // Wire Carrier
    carSourceNode.connect(carFilter);                       // Carrier to bandpass
    carFilter.connect(bandGain); 

    // Wire to Summing Bus
    bandGain.connect(summingGain);                          // Each band to summing bus
    
    // Keep reference so they don't get garbage collected (paranoia)
    bandNodes.push({ modFilter, carFilter, bandGain });     // Store band nodes
  }

  // Start & Render
  modSourceNode.start(0); 
  carSourceNode.start(0);

  const renderedBuffer = await ctx.startRendering();        // Render audio
  // Encode to WAV
  const wavData = await WavEncoder.encode({
    sampleRate: WORK_RATE,
    channelData: [renderedBuffer.getChannelData(0)]
  });

  return Buffer.from(wavData);                              // Return as Node.js Buffer
}

// HELPER FUNCTIONS
function createBufferSource(ctx, decodedData) {
  const audioBuf = ctx.createBuffer(
    decodedData.numberOfChannels,
    decodedData.length,
    decodedData.sampleRate
  );                                                        // Create Audio Buffer
  for (let i = 0; i < decodedData.numberOfChannels; i++) {
    audioBuf.getChannelData(i).set(decodedData.getChannelData(i));
  }                                                         // Fill Audio Buffer
  const src = ctx.createBufferSource();                     // Create Buffer Source Node
  src.buffer = audioBuf;                                    // Set buffer
  return src;                                               // Return Buffer Source Node
}                                                           // Create Buffer Source Node from decoded audio

// Full-Wave Rectifier Curve
function getAbsCurve() {
  const curve = new Float32Array(65536);                    // Create curve
  for (let i = 0; i < 65536; i++) {                         // Fill curve
    // Standard absolute value
    curve[i] = Math.abs((i * 2) / 65536 - 1);               // Normalize -1 to 1
  }
  return curve;                                             // Return absolute value curve
}

// Soft Clipper to prevent harsh distortion at 0dB
function getSoftClipCurve(sampleRate) {
  const k = 100;                                            // Steepness
  const size = 65536;                                       // Resolution
  const curve = new Float32Array(size);                     // Create curve
  const deg = Math.PI / 180;                                // Degree to Radian conversion
  for (let i = 0; i < size; i++) {                          // Fill curve
    const x = (i * 2) / size - 1;                           // Normalize -1 to 1
    // Simple arctan soft clip
    curve[i] = (2 / Math.PI) * Math.atan(2 * x);            // Soft clipping formula
  }
  return curve;                                             // Return soft clipping curve
}

function logFrequencies(min, max, count) {                  // Generate logarithmically spaced frequencies
  const freqs = [];                                         // Result array
  const logMin = Math.log(min);
  const logMax = Math.log(max);                             // Logarithmic bounds
  const step = (logMax - logMin) / (count - 1);             // Logarithmic step
  for (let i = 0; i < count; i++) {
    freqs.push(Math.exp(logMin + step * i));
  }                                                         // Fill frequencies array
  return freqs;                                             // Return array of logarithmically spaced frequencies
}                                                           // Generate logarithmically spaced frequencies