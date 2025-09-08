import { DrumParams, DRUM_PRESETS } from '../drum-synthesizer.service';

// Extended drum presets with more variety
export const EXTENDED_DRUM_PRESETS: Record<string, Partial<DrumParams>> = {
	// Kick Drums
	'kick-classic': {
		waveform: 'sine',
		frequency: 60,
		attack: 0.001,
		decay: 0.3,
		sustain: 0.1,
		release: 0.1,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.1,
		midiNoteStart: 2.0,
		midiNoteEnd: 0.5,
		volume: 0.8
	},
	'kick-808': {
		waveform: 'sine',
		frequency: 50,
		attack: 0.001,
		decay: 0.6,
		sustain: 0.2,
		release: 0.3,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.2,
		midiNoteStart: 3.0,
		midiNoteEnd: 0.3,
		volume: 0.9
	},
	'kick-acoustic': {
		waveform: 'sine',
		frequency: 65,
		attack: 0.002,
		decay: 0.4,
		sustain: 0.15,
		release: 0.2,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.15,
		midiNoteStart: 1.8,
		midiNoteEnd: 0.6,
		volume: 0.75
	},
	'kick-electronic': {
		waveform: 'sine',
		frequency: 55,
		attack: 0.001,
		decay: 0.25,
		sustain: 0.05,
		release: 0.08,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.08,
		midiNoteStart: 2.5,
		midiNoteEnd: 0.4,
		volume: 0.85
	},

	// Snare Drums
	'snare-classic': {
		waveform: 'triangle',
		frequency: 200,
		noiseLevel: 0.6,
		noiseColor: 0.7,
		cutoff: 8000,
		resonance: 2,
		filterType: 'highpass',
		attack: 0.001,
		decay: 0.2,
		sustain: 0.1,
		release: 0.1,
		volume: 0.7
	},
	'snare-tight': {
		waveform: 'triangle',
		frequency: 250,
		noiseLevel: 0.8,
		noiseColor: 0.8,
		cutoff: 10000,
		resonance: 3,
		filterType: 'highpass',
		attack: 0.001,
		decay: 0.15,
		sustain: 0.05,
		release: 0.05,
		volume: 0.75
	},
	'snare-fat': {
		waveform: 'triangle',
		frequency: 150,
		noiseLevel: 0.4,
		noiseColor: 0.5,
		cutoff: 5000,
		resonance: 1.5,
		filterType: 'lowpass',
		attack: 0.001,
		decay: 0.3,
		sustain: 0.2,
		release: 0.2,
		volume: 0.8
	},
	'snare-rimshot': {
		waveform: 'triangle',
		frequency: 300,
		noiseLevel: 0.7,
		noiseColor: 0.9,
		cutoff: 12000,
		resonance: 4,
		filterType: 'highpass',
		attack: 0.001,
		decay: 0.1,
		sustain: 0.02,
		release: 0.05,
		volume: 0.8
	},

	// Hi-Hats
	'hihat-closed': {
		waveform: 'sine',
		frequency: 10000,
		noiseLevel: 0.9,
		noiseColor: 0.9,
		cutoff: 12000,
		resonance: 0.5,
		filterType: 'highpass',
		attack: 0.001,
		decay: 0.1,
		sustain: 0.01,
		release: 0.05,
		volume: 0.6
	},
	'hihat-open': {
		waveform: 'sine',
		frequency: 8000,
		noiseLevel: 0.8,
		noiseColor: 0.8,
		cutoff: 10000,
		resonance: 0.3,
		filterType: 'highpass',
		attack: 0.001,
		decay: 0.3,
		sustain: 0.1,
		release: 0.2,
		volume: 0.7
	},
	'hihat-crispy': {
		waveform: 'sine',
		frequency: 12000,
		noiseLevel: 1.0,
		noiseColor: 1.0,
		cutoff: 15000,
		resonance: 1.0,
		filterType: 'highpass',
		attack: 0.001,
		decay: 0.05,
		sustain: 0.005,
		release: 0.02,
		volume: 0.5
	},
	'hihat-dark': {
		waveform: 'sine',
		frequency: 6000,
		noiseLevel: 0.6,
		noiseColor: 0.4,
		cutoff: 8000,
		resonance: 0.2,
		filterType: 'lowpass',
		attack: 0.001,
		decay: 0.2,
		sustain: 0.05,
		release: 0.1,
		volume: 0.65
	},

	// Cymbals
	'crash-classic': {
		waveform: 'sine',
		frequency: 300,
		noiseLevel: 0.7,
		noiseColor: 0.6,
		cutoff: 6000,
		resonance: 1.5,
		filterType: 'bandpass',
		attack: 0.001,
		decay: 1.0,
		sustain: 0.3,
		release: 2.0,
		volume: 0.8
	},
	'crash-splash': {
		waveform: 'sine',
		frequency: 400,
		noiseLevel: 0.8,
		noiseColor: 0.7,
		cutoff: 8000,
		resonance: 2.0,
		filterType: 'bandpass',
		attack: 0.001,
		decay: 0.5,
		sustain: 0.2,
		release: 1.0,
		volume: 0.7
	},
	'ride-classic': {
		waveform: 'sine',
		frequency: 500,
		noiseLevel: 0.5,
		noiseColor: 0.4,
		cutoff: 4000,
		resonance: 2.0,
		filterType: 'bandpass',
		attack: 0.001,
		decay: 0.8,
		sustain: 0.4,
		release: 1.5,
		volume: 0.7
	},
	'ride-bell': {
		waveform: 'sine',
		frequency: 800,
		noiseLevel: 0.3,
		noiseColor: 0.2,
		cutoff: 3000,
		resonance: 3.0,
		filterType: 'bandpass',
		attack: 0.001,
		decay: 0.3,
		sustain: 0.6,
		release: 0.8,
		volume: 0.6
	},

	// Toms
	'tom-high': {
		waveform: 'sine',
		frequency: 150,
		attack: 0.001,
		decay: 0.3,
		sustain: 0.15,
		release: 0.2,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.15,
		midiNoteStart: 1.8,
		midiNoteEnd: 0.9,
		volume: 0.65
	},
	'tom-mid': {
		waveform: 'sine',
		frequency: 100,
		attack: 0.001,
		decay: 0.4,
		sustain: 0.2,
		release: 0.3,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.2,
		midiNoteStart: 1.5,
		midiNoteEnd: 0.8,
		volume: 0.7
	},
	'tom-low': {
		waveform: 'sine',
		frequency: 80,
		attack: 0.001,
		decay: 0.5,
		sustain: 0.25,
		release: 0.4,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.25,
		midiNoteStart: 1.3,
		midiNoteEnd: 0.7,
		volume: 0.75
	},
	'tom-floor': {
		waveform: 'sine',
		frequency: 60,
		attack: 0.001,
		decay: 0.6,
		sustain: 0.3,
		release: 0.5,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.3,
		midiNoteStart: 1.2,
		midiNoteEnd: 0.6,
		volume: 0.8
	},

	// Percussion
	'clap-classic': {
		waveform: 'square',
		frequency: 200,
		noiseLevel: 0.8,
		noiseColor: 0.7,
		cutoff: 6000,
		resonance: 2.0,
		filterType: 'bandpass',
		attack: 0.001,
		decay: 0.15,
		sustain: 0.05,
		release: 0.1,
		volume: 0.7
	},
	'clap-double': {
		waveform: 'square',
		frequency: 180,
		noiseLevel: 0.9,
		noiseColor: 0.8,
		cutoff: 7000,
		resonance: 2.5,
		filterType: 'bandpass',
		attack: 0.001,
		decay: 0.2,
		sustain: 0.08,
		release: 0.15,
		volume: 0.75
	},
	'rimshot': {
		waveform: 'square',
		frequency: 400,
		attack: 0.001,
		decay: 0.05,
		sustain: 0.01,
		release: 0.02,
		volume: 0.6
	},
	'cowbell': {
		waveform: 'square',
		frequency: 800,
		attack: 0.001,
		decay: 0.1,
		sustain: 0.1,
		release: 0.1,
		volume: 0.5
	},
	'woodblock': {
		waveform: 'square',
		frequency: 600,
		attack: 0.001,
		decay: 0.08,
		sustain: 0.05,
		release: 0.08,
		volume: 0.55
	},
	'tambourine': {
		waveform: 'sine',
		frequency: 2000,
		noiseLevel: 0.6,
		noiseColor: 0.8,
		cutoff: 10000,
		resonance: 1.0,
		filterType: 'highpass',
		attack: 0.001,
		decay: 0.15,
		sustain: 0.1,
		release: 0.2,
		volume: 0.6
	}
};

// Combine original presets with extended ones
export const ALL_DRUM_PRESETS = {
	...DRUM_PRESETS,
	...EXTENDED_DRUM_PRESETS
};

/*
// MIDI note to drum preset mapping (General MIDI standard)
export const MIDI_DRUM_MAPPING: Record<number, string> = {
	// Kick drums
	35: 'kick-classic',	// Acoustic Bass Drum
	36: 'kick-808',			// Bass Drum 1
	
	// Snare drums
	37: 'snare-classic', // Side Stick
	38: 'snare-tight',	 // Acoustic Snare
	40: 'snare-fat',		 // Electric Snare
	
	// Toms
	41: 'tom-floor',		 // Low Floor Tom
	43: 'tom-low',			 // High Floor Tom
	45: 'tom-mid',			 // Low Tom
	47: 'tom-high',			// Low-Mid Tom
	48: 'tom-high',			// Hi-Mid Tom
	50: 'tom-high',			// High Tom
	
	// Hi-hats
	42: 'hihat-closed',	// Closed Hi-Hat
	44: 'hihat-closed',	// Pedal Hi-Hat
	46: 'hihat-open',		// Open Hi-Hat
	
	// Cymbals
	49: 'crash-classic', // Crash Cymbal 1
	51: 'ride-classic',	// Ride Cymbal 1
	52: 'crash-splash',	// Chinese Cymbal
	53: 'ride-bell',		 // Ride Bell
	55: 'crash-splash',	// Splash Cymbal
	57: 'crash-classic', // Crash Cymbal 2
	
	// Percussion
	39: 'clap-classic',	// Hand Clap
	56: 'cowbell',			 // Cowbell
	58: 'tambourine',		// Vibraslap
	59: 'ride-bell',		 // Ride Cymbal 2
	60: 'woodblock',		 // Hi Bongo
	61: 'woodblock',		 // Low Bongo
	62: 'woodblock',		 // Mute Hi Conga
	63: 'woodblock',		 // Open Hi Conga
	64: 'woodblock',		 // Low Conga
	65: 'woodblock',		 // High Timbale
	66: 'woodblock',		 // Low Timbale
	67: 'woodblock',		 // High Agogo
	68: 'woodblock',		 // Low Agogo
	69: 'woodblock',		 // Cabasa
	70: 'woodblock',		 // Maracas
	71: 'woodblock',		 // Short Whistle
	72: 'woodblock',		 // Long Whistle
	73: 'woodblock',		 // Short Guiro
	74: 'woodblock',		 // Long Guiro
	75: 'woodblock',		 // Claves
	76: 'woodblock',		 // Hi Wood Block
	77: 'woodblock',		 // Low Wood Block
	78: 'woodblock',		 // Mute Cuica
	79: 'woodblock',		 // Open Cuica
	80: 'woodblock',		 // Mute Triangle
	81: 'woodblock'			// Open Triangle
};*/
export const MIDI_DRUM_MAPPING: Record<number, string> = Object.keys(ALL_DRUM_PRESETS).reduce((acc, preset, index) => {
	acc[index+24+35] = preset;
	return acc;
}, {} as Record<number, string>);

