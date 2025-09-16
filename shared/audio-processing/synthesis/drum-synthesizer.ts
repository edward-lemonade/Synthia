import { MidiNote, ProjectStudio } from "../../types";
import { MIDI_DRUM_MAPPING, DRUM_PRESETS, DEFAULT_KICK } from "./presets/drums";

import { AudioContext, AudioBuffer, AudioBufferSourceNode, OfflineAudioContext, OscillatorNode, GainNode, BiquadFilterNode } from 'isomorphic-web-audio-api';

export interface DrumVoice {
	oscillators: OscillatorNode[];
	gainNode: GainNode;
	filterNode?: BiquadFilterNode;
	noiseNode?: AudioBufferSourceNode;

	endTime: number;
	midiNote: number;

	trackId?: string;
	noteId?: string;
}
export interface DrumParams {
	// Oscillator settings
	waveform: OscillatorType;
	frequency: number;
	detune: number;
	
	// Noise settings (for snare, hi-hat)
	noiseLevel: number;
	noiseColor: number; // 0-1, affects filter cutoff
	
	// Filter settings
	cutoff: number;
	resonance: number;
	filterType: BiquadFilterType;
	
	// Envelope settings
	attack: number;
	decay: number;
	sustain: number;
	release: number;
	
	// MidiNote envelope (for kick drum)
	midiNoteAttack: number;
	midiNoteDecay: number;
	midiNoteStart: number; // multiplier for initial frequency
	midiNoteEnd: number;   // multiplier for final frequency
	
	// Master settings
	volume: number;
	drive: number;
}

export type DrumType = 'kick' | 'snare' | 'hihat' | 'openhat' | 'crash' | 'ride' | 'tom' | 'clap' | 'rim' | 'cowbell';

interface CreateDrumParams {
	ctx: AudioContext | OfflineAudioContext, 
	output: AudioNode, 
	drumParams: DrumParams, 
	midiNote: number,
	startTime: number, 
	endTime: number, 
	gain: number, 
	oscillators: OscillatorNode[], 
	ampGain: GainNode,
	filter?: BiquadFilterNode,
}

export class DrumSynthesizer {
	declare posToTime: (pos: number) => number;
	
	constructor(
		posToTime: (pos: number) => number,
	) {
		this.posToTime = posToTime;
	}

	initializeNoiseBuffer(audioContext: AudioContext | OfflineAudioContext) {
		const ctx = audioContext;
		
		const bufferSize = ctx.sampleRate * 2; // 2 seconds
		const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);

		const output = noiseBuffer.getChannelData(0);
		
		for (let i = 0; i < bufferSize; i++) {
			output[i] = Math.random() * 2 - 1;
		}

		return noiseBuffer;
	}

	// ========================================================================================
	// Drum Synthesis

	startNote(
		audioContext: AudioContext | OfflineAudioContext,
		outputNode: AudioNode,
		drumParams: DrumParams,
		midiData: MidiNote,
		startTime: number,
		endTime: number,
		offline?: boolean,
	): DrumVoice | null {
		const ctx = audioContext;
		
		if (!ctx) {
			console.warn('DrumSynthesizerService not initialized with AudioContext');
			return null;
		}
		if (!offline && startTime < ctx.currentTime - 0.001) { // For realtime, adjust start time if in the past
			startTime = ctx.currentTime;
		}

		const velocity = midiData.velocity;
		const midiNote = midiData.midiNote;
		
		const drumType = this.getDrumTypeFromMidiNote(midiNote);
		const gain = this.velocityToGain(velocity) * drumParams.volume;

		try {
			const oscillators: OscillatorNode[] = [];
			const attackEnd = startTime + drumParams.attack;
			const decayEnd = attackEnd + drumParams.decay;
			const noteReleaseStart = endTime;
			const noteReleaseEnd = noteReleaseStart + drumParams.release;

			// Create main gain node
			const ampGain = ctx.createGain();
			ampGain.connect(outputNode);

			// Create filter if needed
			let filter: BiquadFilterNode | undefined;
			if (drumParams.cutoff < 20000) {
				filter = ctx.createBiquadFilter();
				filter.type = drumParams.filterType;
				filter.Q.setValueAtTime(drumParams.resonance, startTime);
				filter.connect(ampGain);
			}

			const output = filter || ampGain;

			const params: CreateDrumParams = {
				ctx, output, drumParams, midiNote, startTime, endTime: noteReleaseEnd, gain, oscillators, ampGain, filter 
			}

			switch (drumType) {
				case 'kick':
					return this.createKickDrum(params);
				case 'snare':
					return this.createSnareDrum(params);
				case 'hihat':
				case 'openhat':
					return this.createHiHat(params);
				case 'crash':
				case 'ride':
					return this.createCymbal(params);
				case 'tom':
					return this.createTom(params);
				case 'clap':
					return this.createClap(params);
				case 'rim':
					return this.createRim(params);
				case 'cowbell':
					return this.createCowbell(params);
				default:
					return this.createKickDrum(params);
			}
		} catch (error) {
			console.error(error);
			return null;
		}
	}

	stopNote (voice: DrumVoice, drumParams: DrumParams, stopTime: number): void {
		const { release } = drumParams;

		// Cancel any scheduled changes and fade out smoothly
		voice.gainNode.gain.cancelScheduledValues(stopTime);
		voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, stopTime);
		voice.gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime + release);

		// Stop oscillators
		voice.oscillators.forEach(osc => {
			try {
				osc.stop(stopTime + release);
			} catch (e) {
				// Already stopped
			}
		});

		// Stop noise if present
		if (voice.noiseNode) {
			try {
				voice.noiseNode.stop(stopTime + release);
			} catch (e) {
				// Already stopped
			}
		}

		voice.endTime = stopTime + release;
	}

	private createKickDrum(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;
		
		// Create main oscillator
		const osc = ctx!.createOscillator();
		osc.type = drumParams.waveform;
		osc.frequency.setValueAtTime(drumParams.frequency * drumParams.midiNoteStart, startTime);
		
		// MidiNote envelope - quick drop from high to low frequency
		const midiNoteDecayEnd = startTime + drumParams.midiNoteDecay;
		osc.frequency.exponentialRampToValueAtTime(
			drumParams.frequency * drumParams.midiNoteEnd, 
			midiNoteDecayEnd
		);
		
		oscillators.push(osc);
		osc.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start oscillator
		osc.start(startTime);
		osc.stop(endTime);
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: undefined,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	private createSnareDrum(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;

		// Create tone oscillator (for the "thud")
		const toneOsc = ctx!.createOscillator();
		toneOsc.type = 'triangle';
		toneOsc.frequency.setValueAtTime(drumParams.frequency, startTime);
		oscillators.push(toneOsc);

		let noiseNode: AudioBufferSourceNode | undefined;
		if (drumParams.noiseLevel > 0) {
			const noiseBuffer = this.initializeNoiseBuffer(ctx);
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = noiseBuffer;
			noiseNode.loop = true;
		}

		//console.log(noiseNode, !!this.noiseBuffer);
		
		// Mix tone and noise
		const mixer = ctx!.createGain();
		const toneGain = ctx!.createGain();
		const noiseGain = ctx!.createGain();
		
		toneGain.gain.setValueAtTime(0.3, startTime);
		noiseGain.gain.setValueAtTime(drumParams.noiseLevel, startTime);
		
		toneOsc.connect(toneGain);
		if (noiseNode) {
			noiseNode.connect(noiseGain);
		}
		
		toneGain.connect(mixer);
		noiseGain.connect(mixer);
		mixer.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start sources
		toneOsc.start(startTime);
		toneOsc.stop(endTime);
		if (noiseNode) {
			noiseNode.start(startTime);
			noiseNode.stop(endTime);
		}

		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: noiseNode,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	private createHiHat(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;
		
		// Hi-hat is mostly filtered noise
		let noiseNode: AudioBufferSourceNode | undefined;
		if (drumParams.noiseLevel > 0) {
			const noiseBuffer = this.initializeNoiseBuffer(ctx);
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = noiseBuffer;
			noiseNode.loop = true;
		}
		
		// High-pass filter for brightness
		const hpFilter = ctx!.createBiquadFilter();
		hpFilter.type = 'highpass';
		hpFilter.frequency.setValueAtTime(8000, startTime);
		hpFilter.Q.setValueAtTime(0.5, startTime);
		
		if (noiseNode) {
			noiseNode.connect(hpFilter);
		}
		hpFilter.connect(output);
		
		// Amplitude envelope - very quick attack and decay
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start noise
		if (noiseNode) {
			noiseNode.start(startTime);
			noiseNode.stop(endTime);
		}
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: noiseNode,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	private createCymbal(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;
		
		// Cymbal is filtered noise with some tonal content
		let noiseNode: AudioBufferSourceNode | undefined;
		if (drumParams.noiseLevel > 0) {
			const noiseBuffer = this.initializeNoiseBuffer(ctx);
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = noiseBuffer;
			noiseNode.loop = true;
		}
		
		// Add some tonal content
		const osc1 = ctx!.createOscillator();
		const osc2 = ctx!.createOscillator();
		osc1.type = 'sine';
		osc2.type = 'sine';
		osc1.frequency.setValueAtTime(drumParams.frequency, startTime);
		osc2.frequency.setValueAtTime(drumParams.frequency * 1.5, startTime);
		
		oscillators.push(osc1, osc2);
		
		// Mix noise and oscillators
		const mixer = ctx!.createGain();
		const noiseGain = ctx!.createGain();
		const oscGain = ctx!.createGain();
		
		noiseGain.gain.setValueAtTime(0.7, startTime);
		oscGain.gain.setValueAtTime(0.3, startTime);
		
		if (noiseNode) {
			noiseNode.connect(noiseGain);
		}
		osc1.connect(oscGain);
		osc2.connect(oscGain);
		
		noiseGain.connect(mixer);
		oscGain.connect(mixer);
		mixer.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start sources
		osc1.start(startTime);
		osc1.stop(endTime);
		osc2.start(startTime);
		osc2.stop(endTime);
		if (noiseNode) {
			noiseNode.start(startTime);
			noiseNode.stop(endTime);
		}
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: noiseNode,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	private createTom(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;

		// Tom is a midiNoteed drum with midiNote envelope
		const osc = ctx!.createOscillator();
		osc.type = drumParams.waveform;
		osc.frequency.setValueAtTime(drumParams.frequency * drumParams.midiNoteStart, startTime);
		
		// MidiNote envelope - slower than kick
		const midiNoteDecayEnd = startTime + drumParams.midiNoteDecay;
		osc.frequency.exponentialRampToValueAtTime(
			drumParams.frequency * drumParams.midiNoteEnd, 
			midiNoteDecayEnd
		);
		
		oscillators.push(osc);
		osc.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start oscillator
		osc.start(startTime);
		osc.stop(endTime);
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: undefined,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	private createClap(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;
		
		// Clap is multiple noise bursts
		let noiseNode: AudioBufferSourceNode | undefined;
		if (drumParams.noiseLevel > 0) {
			const noiseBuffer = this.initializeNoiseBuffer(ctx);
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = noiseBuffer;
			noiseNode.loop = true;
		}
		
		// Create multiple noise bursts with slight delays
		const mixer = ctx!.createGain();
		const delays = [0, 0.01, 0.02, 0.03]; // Multiple clap sounds
		
		delays.forEach((delay, index) => {
			const burstGain = ctx!.createGain();
			burstGain.gain.setValueAtTime(0, startTime + delay);
			burstGain.gain.linearRampToValueAtTime(gain * 0.3, startTime + delay + 0.001);
			burstGain.gain.exponentialRampToValueAtTime(0.001, startTime + delay + 0.1);
			
			if (noiseNode) {
				noiseNode.connect(burstGain);
			}
			burstGain.connect(mixer);
		});
		
		mixer.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start noise
		if (noiseNode) {
			noiseNode.start(startTime);
			noiseNode.stop(endTime);
		}
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: noiseNode,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	private createRim(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;
		
		// Rim shot is a short, bright click
		const osc = ctx!.createOscillator();
		osc.type = 'square';
		osc.frequency.setValueAtTime(drumParams.frequency, startTime);
		
		oscillators.push(osc);
		osc.connect(output);
		
		// Very short amplitude envelope
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start oscillator
		osc.start(startTime);
		osc.stop(endTime);
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: undefined,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	private createCowbell(params: CreateDrumParams): DrumVoice {
		const {ctx, output, drumParams, midiNote, startTime, endTime, gain, oscillators, ampGain, filter} = params;
		
		// Cowbell is a metallic, resonant sound
		const osc1 = ctx!.createOscillator();
		const osc2 = ctx!.createOscillator();
		osc1.type = 'square';
		osc2.type = 'triangle';
		osc1.frequency.setValueAtTime(drumParams.frequency, startTime);
		osc2.frequency.setValueAtTime(drumParams.frequency * 1.5, startTime);
		
		oscillators.push(osc1, osc2);
		
		// Mix oscillators
		const mixer = ctx!.createGain();
		const osc1Gain = ctx!.createGain();
		const osc2Gain = ctx!.createGain();
		
		osc1Gain.gain.setValueAtTime(0.7, startTime);
		osc2Gain.gain.setValueAtTime(0.3, startTime);
		
		osc1.connect(osc1Gain);
		osc2.connect(osc2Gain);
		osc1Gain.connect(mixer);
		osc2Gain.connect(mixer);
		mixer.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + drumParams.attack;
		const decayEnd = attackEnd + drumParams.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * drumParams.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start oscillators
		osc1.start(startTime);
		osc1.stop(endTime);
		osc2.start(startTime);
		osc2.stop(endTime);
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noiseNode: undefined,

			endTime: endTime,
			midiNote: midiNote,
		};
	}

	// ========================================================================================
	// Utility

	private velocityToGain(velocity: number): number { return Math.pow(velocity / 127, 1.5); }
	getDrumParams(drumType: DrumType): DrumParams { return {...DEFAULT_KICK, ...DRUM_PRESETS[drumType] ?? {}} }
	getDrumTypeFromMidiNote(midiNote: number): DrumType {
		const presetName = MIDI_DRUM_MAPPING[midiNote];
		if (presetName) {
			const drumType = presetName.split('-')[0] as DrumType;
			return drumType;
		}
		return 'kick'; // Default
	}
}