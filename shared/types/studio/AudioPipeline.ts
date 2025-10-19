
// Synth/Source Clip [Fade] >> Track [WASM FX, Gain, Pan, Reverb] >> Master [Gain] 
// Some clip options like pitch, time-stretch, etc must be baked into source.

// =================================================================
// Layers

export class RpClipLayer {
	nodes: RpNode[] = []; // (FadeIn) >> (FadeOut)
	regionId: string|null = null;

	constructor() {}
}
export class RpTrackLayer {
	nodes: RpNode[] = []; // (FX)* >> Gain >> Pan >> Reverb
	children: RpClipLayer[] = [];
	
	constructor () {}
}
export class RpMasterLayer { 
	nodes: RpNode[] = []; // (Compressor) >> (EQ) >> Gain
	children: RpTrackLayer[] = [];

	constructor () {}
}

// =================================================================
// Node defs

export enum RpNativeNodeType {
	Gain, 
	Pan, 
	Reverb, 
	FadeIn, FadeOut,
	EQ, 
	Compression, Limiter, Gate,
	Delay, Flanger, Phaser,
	Distortion, Overdrive, Fuzz, SoftClip, HardClip, Saturation, Bitcrush, CustomDistortion,  
	WASM 
}
export enum RpWasmNodeType {
	FineEQ,
	Autotune,
	NoiseReduction,
	SpectralMorph,
	Vocoder,
	Underwater,
	Glitch,
	Function,
}

export interface RpNode {
	type: RpNativeNodeType;
	params: any;
	node: AudioNode;
}

// =================================================================
// Native node specifics (Web Audio API)

// Primitives
export interface RpGain 	extends RpNode { type: RpNativeNodeType.Gain, 	params: { gain: number } }
export interface RpPan 		extends RpNode { type: RpNativeNodeType.Pan, 		params: { pan: number } }
export interface RpReverb 	extends RpNode { type: RpNativeNodeType.Reverb, 	params: { reverb: number } }
export interface RpFadeIn 	extends RpNode { type: RpNativeNodeType.FadeIn, 	params: { time: number } }
export interface RpFadeOut 	extends RpNode { type: RpNativeNodeType.FadeOut, 	params: { time: number } }
//export interface RpWasm 	extends RpNode { type: RpNativeNodeType.WASM, params: { nodes: RpWasmNode[] } }

// EQ
interface EQBandParams {
	freq: number;
	gain: number;
	Q: number;
}
export interface RpEQ extends RpNode { 
	type: RpNativeNodeType.EQ,
	params: {
		lowShelf: EQBandParams,
		lowMid: EQBandParams,
		mid: EQBandParams,
		highMid: EQBandParams,
		highShelf: EQBandParams,
	}
}

// Dynamics
export interface RpCompression extends RpNode {
	type: RpNativeNodeType.Compression; // exact parameter names
	params: {
		threshold: number;  // -100 to 0 dB
		knee: number;       // 0-40 dB (smoothness of compression curve)
		ratio: number;      // 1-20 (compression ratio)
		attack: number;     // 0-1 seconds
		release: number;    // 0-1 seconds
		makeupGain: number; // 0-2 (compensate for volume reduction)
	};
}
export interface RpLimiter extends RpNode {
	type: RpNativeNodeType.Limiter;
	params: {
		threshold: number;  // DynamicsCompressorNode.threshold.value: -20 to 0 dB
		release: number;    // DynamicsCompressorNode.release.value: 0.01 to 1 seconds
		// Fixed internally: knee=0, ratio=20, attack=0.001
	};
}

// Gate (AudioWorkletNode for precise control)
export interface RpGate extends RpNode {
	type: RpNativeNodeType.Gate;
	params: {
		threshold: number;  // -100 to 0 dB (signal below this gets attenuated)
		attack: number;     // 0.001 to 0.1 seconds (how fast gate opens)
		release: number;    // 0.01 to 2 seconds (how fast gate closes)
		range: number;      // 0 to 1 (attenuation amount when closed, 0=full cut, 1=no attenuation)
	};
}

// Time-based
export interface RpDelay extends RpNode {
	type: RpNativeNodeType.Delay;
	params: {
		delayTime: number;  // 0-2 seconds
		feedback: number;   // 0-0.95 (prevents runaway feedback)
		mix: number;        // 0-1 (dry/wet)
		lowpassFreq: number; // 200-20000 Hz (filter for feedback path)
	};
}
export interface RpFlanger extends RpNode {
	type: RpNativeNodeType.Flanger;
	params: {
		speed: number;      // 0.1-10 Hz (LFO rate)
		depth: number;      // 0-0.01 seconds (delay modulation amount)
		feedback: number;   // 0-0.9
		mix: number;        // 0-1 (dry/wet)
	};
}
export interface RpPhaser extends RpNode {
	type: RpNativeNodeType.Phaser;
	params: {
		speed: number;      // 0.1-10 Hz (LFO rate)
		depth: number;      // 0-1 (modulation intensity)
		feedback: number;   // 0-0.9
		stages: number;     // 2-12 (number of allpass filters)
		mix: number;        // 0-1 (dry/wet)
	};
}

// Distortion Family (waveshaper)
export interface RpDistortion extends RpNode {
	type: RpNativeNodeType.Distortion;
	params: {
		amount: number;     // 0-1 (distortion intensity)
		tone: number;       // 0-1 (post-distortion lowpass filter)
		outputGain: number; // 0-1 (compensate for volume increase)
	};
}
export interface RpOverdrive extends RpNode {
	type: RpNativeNodeType.Overdrive;
	params: {
		drive: number;      // 0-1 (overdrive intensity)
		tone: number;       // 0-1 (tone control)
		outputGain: number; // 0-1
	};
}
export interface RpFuzz extends RpNode {
	type: RpNativeNodeType.Fuzz;
	params: {
		fuzz: number;       // 0-1 (fuzz intensity)
		gate: number;       // 0-1 (noise gate threshold)
		outputGain: number; // 0-1
	};
}
export interface RpSoftClip extends RpNode {
	type: RpNativeNodeType.SoftClip;
	params: {
		threshold: number;  // 0-1 (clipping threshold)
		knee: number;       // 0-1 (softness of clipping curve)
	};
}
export interface RpHardClip extends RpNode {
	type: RpNativeNodeType.HardClip;
	params: {
		threshold: number;  // 0-1 (clipping threshold)
	};
}
export interface RpSaturation extends RpNode {
	type: RpNativeNodeType.Saturation;
	params: {
		drive: number;      // 0-2 (saturation amount)
		harmonics: number;  // 0-1 (even/odd harmonic blend)
		outputGain: number; // 0-1
	};
}
export interface RpBitcrush extends RpNode {
	type: RpNativeNodeType.Bitcrush;
	params: {
		bits: number;       // 1-16 (bit depth)
		sampleRate: number; // 100-44100 Hz (sample rate reduction)
		mix: number;        // 0-1 (dry/wet)
	};
}
export interface RpCustomDistortion extends RpNode {
	type: RpNativeNodeType.CustomDistortion;
	params: {
		curve: Float32Array;     // WaveShaperNode.curve: the transfer function
		oversample: 'none' | '2x' | '4x';  // WaveShaperNode.oversample
	};
}

