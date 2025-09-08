import { SynthParams } from "../midi-synthesizer.service";

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
	},
	'Melancholy Dreams': {
		waveform1: 'sine',
		waveform2: 'triangle',
		osc2Detune: 5,
		osc2Level: 0.4,
		subLevel: 0.1,
		
		cutoff: 900,
		resonance: 1.5,
		filterType: 'lowpass',
		filterEnvAmount: 0.3,
		
		attack: 0.8,
		decay: 1.2,
		sustain: 0.8,
		release: 2.5,
		
		filterAttack: 1.0,
		filterDecay: 1.5,
		filterSustain: 0.6,
		filterRelease: 3.0,
		
		lfoRate: 0.2,
		lfoAmount: 0.15,
		lfoTarget: 'midiNote',
		
		volume: 0.6,
		drive: 0.8
	},
	'Aggressive Rage': {
		waveform1: 'square',
		waveform2: 'sawtooth',
		osc2Detune: 0,
		osc2Level: 0.8,
		subLevel: 0.4,
		
		cutoff: 4500,
		resonance: 12,
		filterType: 'highpass',
		filterEnvAmount: 1.5,
		
		attack: 0.001,
		decay: 0.05,
		sustain: 0.9,
		release: 0.1,
		
		filterAttack: 0.001,
		filterDecay: 0.08,
		filterSustain: 0.7,
		filterRelease: 0.2,
		
		lfoRate: 8.5,
		lfoAmount: 0.3,
		lfoTarget: 'filter',
		
		volume: 0.8,
		drive: 2.5
	},
	'Euphoric Joy': {
		waveform1: 'sawtooth',
		waveform2: 'triangle',
		osc2Detune: 12,
		osc2Level: 0.5,
		subLevel: 0.2,
		
		cutoff: 3500,
		resonance: 6,
		filterType: 'lowpass',
		filterEnvAmount: 1.0,
		
		attack: 0.02,
		decay: 0.15,
		sustain: 0.7,
		release: 0.6,
		
		filterAttack: 0.01,
		filterDecay: 0.2,
		filterSustain: 0.5,
		filterRelease: 0.8,
		
		lfoRate: 6.0,
		lfoAmount: 0.2,
		lfoTarget: 'midiNote',
		
		volume: 0.75,
		drive: 1.6
	},
	'Mysterious Void': {
		waveform1: 'triangle',
		waveform2: 'sine',
		osc2Detune: -24,
		osc2Level: 0.3,
		subLevel: 0.5,
		
		cutoff: 600,
		resonance: 3,
		filterType: 'lowpass',
		filterEnvAmount: 0.5,
		
		attack: 1.5,
		decay: 2.0,
		sustain: 0.4,
		release: 3.0,
		
		filterAttack: 2.0,
		filterDecay: 3.0,
		filterSustain: 0.2,
		filterRelease: 4.0,
		
		lfoRate: 0.1,
		lfoAmount: 0.4,
		lfoTarget: 'filter',
		
		volume: 0.5,
		drive: 0.6
	},
	'Nostalgic Warmth': {
		waveform1: 'sawtooth',
		waveform2: 'triangle',
		osc2Detune: 7,
		osc2Level: 0.6,
		subLevel: 0.3,
		
		cutoff: 1500,
		resonance: 2.5,
		filterType: 'lowpass',
		filterEnvAmount: 0.4,
		
		attack: 0.3,
		decay: 0.8,
		sustain: 0.8,
		release: 1.5,
		
		filterAttack: 0.4,
		filterDecay: 1.0,
		filterSustain: 0.7,
		filterRelease: 2.0,
		
		lfoRate: 0.5,
		lfoAmount: 0.08,
		lfoTarget: 'amplitude',
		
		volume: 0.65,
		drive: 1.0
	},
	'Anxiety Spiral': {
		waveform1: 'square',
		waveform2: 'triangle',
		osc2Detune: 13,
		osc2Level: 0.4,
		subLevel: 0.1,
		
		cutoff: 2800,
		resonance: 8,
		filterType: 'bandpass',
		filterEnvAmount: 0.9,
		
		attack: 0.005,
		decay: 0.1,
		sustain: 0.3,
		release: 0.3,
		
		filterAttack: 0.01,
		filterDecay: 0.15,
		filterSustain: 0.2,
		filterRelease: 0.4,
		
		lfoRate: 7.3,
		lfoAmount: 0.25,
		lfoTarget: 'midiNote',
		
		volume: 0.6,
		drive: 1.8
	},
	'Peaceful Serenity': {
		waveform1: 'sine',
		waveform2: 'sine',
		osc2Detune: 12,
		osc2Level: 0.3,
		subLevel: 0.1,
		
		cutoff: 1000,
		resonance: 0.5,
		filterType: 'lowpass',
		filterEnvAmount: 0.2,
		
		attack: 1.0,
		decay: 1.5,
		sustain: 0.9,
		release: 2.0,
		
		filterAttack: 1.2,
		filterDecay: 2.0,
		filterSustain: 0.8,
		filterRelease: 2.5,
		
		lfoRate: 0.3,
		lfoAmount: 0.05,
		lfoTarget: 'amplitude',
		
		volume: 0.55,
		drive: 0.7
	},
	'Electric Excitement': {
		waveform1: 'square',
		waveform2: 'sawtooth',
		osc2Detune: -5,
		osc2Level: 0.7,
		subLevel: 0.3,
		
		cutoff: 4000,
		resonance: 7,
		filterType: 'lowpass',
		filterEnvAmount: 1.3,
		
		attack: 0.001,
		decay: 0.08,
		sustain: 0.6,
		release: 0.3,
		
		filterAttack: 0.001,
		filterDecay: 0.12,
		filterSustain: 0.4,
		filterRelease: 0.5,
		
		lfoRate: 5.8,
		lfoAmount: 0.18,
		lfoTarget: 'filter',
		
		volume: 0.75,
		drive: 2.0
	},
	'Lonely Echoes': {
		waveform1: 'triangle',
		waveform2: 'sine',
		osc2Detune: -12,
		osc2Level: 0.2,
		subLevel: 0.4,
		
		cutoff: 800,
		resonance: 4,
		filterType: 'lowpass',
		filterEnvAmount: 0.6,
		
		attack: 0.5,
		decay: 1.8,
		sustain: 0.3,
		release: 2.8,
		
		filterAttack: 0.8,
		filterDecay: 2.5,
		filterSustain: 0.2,
		filterRelease: 3.5,
		
		lfoRate: 0.15,
		lfoAmount: 0.3,
		lfoTarget: 'amplitude',
		
		volume: 0.5,
		drive: 0.9
	},
	'Dark Energy': {
		waveform1: 'sawtooth',
		waveform2: 'square',
		osc2Detune: -7,
		osc2Level: 0.6,
		subLevel: 0.8,
		
		cutoff: 1200,
		resonance: 10,
		filterType: 'lowpass',
		filterEnvAmount: 1.1,
		
		attack: 0.02,
		decay: 0.4,
		sustain: 0.7,
		release: 0.8,
		
		filterAttack: 0.01,
		filterDecay: 0.3,
		filterSustain: 0.5,
		filterRelease: 1.0,
		
		lfoRate: 1.2,
		lfoAmount: 0.4,
		lfoTarget: 'filter',
		
		volume: 0.7,
		drive: 1.8
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