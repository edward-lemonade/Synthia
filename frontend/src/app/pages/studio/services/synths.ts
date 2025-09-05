import { SynthParams } from "./midi-synthesizer.service";

export const SYNTHS: Record<string, Partial<SynthParams>> = { 
	'Golden Synth': {
		waveform1: 'sawtooth',
		waveform2: 'square',
		osc2Detune: -7,
		osc2Level: 0.3,
		subLevel: 0.2,

		cutoff: 2000,
		resonance: 4,
		filterType: 'lowpass',
		filterEnvAmount: 0.7,

		attack: 0.01,
		decay: 0.3,
		sustain: 0.6,
		release: 0.5,

		filterAttack: 0.02,
		filterDecay: 0.4,
		filterSustain: 0.3,
		filterRelease: 0.8,

		lfoRate: 4.2,
		lfoAmount: 0.05,
		lfoTarget: 'filter',
		
		volume: 0.7,
		drive: 1.2
	},
	'Analog Bass': {
		waveform1: 'sawtooth',
		waveform2: 'square',
		osc2Level: 0.4,
		subLevel: 0.6,
		cutoff: 800,
		resonance: 8,
		filterEnvAmount: 0.8,
		attack: 0.005,
		decay: 0.2,
		sustain: 0.8,
		release: 0.3
	},
	'Warm Pad': {
		waveform1: 'sawtooth',
		waveform2: 'triangle',
		osc2Detune: 12,
		osc2Level: 0.3,
		subLevel: 0.1,
		cutoff: 1200,
		resonance: 2,
		attack: 0.5,
		decay: 0.8,
		sustain: 0.7,
		release: 1.2,
		lfoRate: 0.3,
		lfoAmount: 0.1,
		lfoTarget: 'filter'
	},
	'Pluck Lead': {
		waveform1: 'sawtooth',
		waveform2: 'square',
		osc2Level: 0.2,
		cutoff: 3000,
		resonance: 6,
		filterEnvAmount: 1.2,
		attack: 0.001,
		decay: 0.3,
		sustain: 0.1,
		release: 0.4,
		filterDecay: 0.2
	}
};

export const DEFAULT_SYNTH: SynthParams = {
	// Analog-style dual oscillator
	waveform1: 'sawtooth',
	waveform2: 'square',
	osc2Detune: -7, // slightly detuned for fatness
	osc2Level: 0.3,
	subLevel: 0.2,
	
	// Low-pass filter with resonance
	cutoff: 2000,
	resonance: 4,
	filterType: 'lowpass',
	filterEnvAmount: 0.7,
	
	// Punchy envelope
	attack: 0.01,
	decay: 0.3,
	sustain: 0.6,
	release: 0.5, // Important: non-zero to prevent pops!
	
	// Filter envelope for movement
	filterAttack: 0.02,
	filterDecay: 0.4,
	filterSustain: 0.3,
	filterRelease: 0.8,
	
	// Subtle modulation
	lfoRate: 4.2,
	lfoAmount: 0.05,
	lfoTarget: 'filter',
	
	// Master
	volume: 0.7,
	drive: 1.2
}