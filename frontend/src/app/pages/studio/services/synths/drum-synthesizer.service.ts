import { Injectable } from '@angular/core';
import { MidiNote, MidiRegion } from '@shared/types';
import { ViewportService } from '../viewport.service';
import { TracksService } from '../tracks.service';
import { ObjectStateNode } from '../../state/state.factory';
import { MidiSource } from './midi-synthesizer.service';
import { ALL_DRUM_PRESETS, MIDI_DRUM_MAPPING } from './presets/drums';

export interface DrumVoice {
	oscillators: OscillatorNode[];
	noiseNode?: AudioBufferSourceNode;
	gainNode: GainNode;
	filterNode?: BiquadFilterNode;
	noteId: string;
	endTime: number;
	midiNote: number;
	trackId: string;
	drumType: DrumType;
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

export interface TrackDrumConfig {
	trackId: string;
	drumParams: DrumParams;
	preset?: string;
}

export type DrumType = 'kick' | 'snare' | 'hihat' | 'openhat' | 'crash' | 'ride' | 'tom' | 'clap' | 'rim' | 'cowbell';

@Injectable()
export class DrumSynthesizerService {
	private static _instance: DrumSynthesizerService;
	static get instance(): DrumSynthesizerService { return DrumSynthesizerService._instance; }

	private audioContext?: AudioContext;
	private activeVoices = new Map<string, DrumVoice>();
	
	// Track-specific drum configurations
	private trackDrumConfigs = new Map<string, DrumParams>();
	
	// Noise buffer for snare and hi-hat
	private noiseBuffer?: AudioBuffer;
	
	constructor() {
		DrumSynthesizerService._instance = this;
	}

	async initialize(audioContext: AudioContext) {
		this.audioContext = audioContext;
		await this.generateNoiseBuffer();
	}

	// ========================================================================================
	// Track Management

	setTrackDrumParams(trackId: string, params: Partial<DrumParams>) {
		const existingParams = this.trackDrumConfigs.get(trackId) || { ...DEFAULT_KICK };
		const newParams = { ...existingParams, ...params };
		this.trackDrumConfigs.set(trackId, newParams);
	}

	applyTrackPreset(trackId: string, presetName: string) {
		const preset = ALL_DRUM_PRESETS[presetName];
		if (preset) {
			this.trackDrumConfigs.set(trackId, {...DEFAULT_KICK, ...preset });
		}
	}

	getTrackDrumParams(trackId: string): DrumParams {
		return this.trackDrumConfigs.get(trackId) || { ...DEFAULT_KICK };
	}

	getDrumParams(drumType: DrumType): DrumParams {
		return {...DEFAULT_KICK, ...ALL_DRUM_PRESETS[drumType] ?? {}}
	}

	// ========================================================================================
	// MIDI Source Creation

	createMidiSource(
		midiData: MidiNote[], 
		regionStartTime: number, 
		regionDuration: number,
		trackId: string
	): MidiSource {
		const noteIds: string[] = [];
		let isConnected = false;
		let outputNode: AudioNode;

		return {
			notes: [...midiData],
			trackId,
			
			connect: (destination: AudioNode) => {
				outputNode = destination;
				isConnected = true;
			},
			
			start: (when: number = 0, offset: number = 0, duration?: number) => {
				if (!isConnected || !outputNode) {
					console.warn('Drum MIDI source not connected to output');
					return;
				}

				const actualDuration = duration ?? regionDuration;
				const endTime = when + actualDuration;
				
				midiData.forEach((note, index) => {
					const noteStartTime = when + ViewportService.instance.posToTime(note.start) - offset;
					const noteEndTime = noteStartTime + ViewportService.instance.posToTime(note.duration);

					// Skip notes outside playback range
					if (noteEndTime <= when || noteStartTime >= endTime) {
						return;
					}
					
					// Adjust timing for partial playback
					const actualStartTime = Math.max(noteStartTime, when);
					const actualEndTime = Math.min(noteEndTime, endTime);
					const actualNoteDuration = actualEndTime - actualStartTime;
					
					if (actualNoteDuration > 0.001) { // Minimum 1ms duration
						const noteId = this.startDrum(
							note.midiNote,
							note.velocity || 100,
							actualStartTime,
							actualEndTime,
							note.channel ?? 0,
							outputNode,
							trackId
						);
						
						if (noteId) {
							noteIds.push(noteId);
						}
					}
				});
			},
			
			stop: (when?: number) => {
				const stopTime = when ?? this.audioContext!.currentTime;
				noteIds.forEach(noteId => {
					this.stopDrum(noteId, stopTime);
				});
			},
			
			noteIds
		};
	}

	// ========================================================================================
	// Drum Synthesis

	private async generateNoiseBuffer(): Promise<void> {
		if (!this.audioContext) return;
		
		const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds
		this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
		const output = this.noiseBuffer.getChannelData(0);
		
		for (let i = 0; i < bufferSize; i++) {
			output[i] = Math.random() * 2 - 1;
		}
	}

	private startDrum(
		midiNote: number, 
		velocity: number, 
		startTime: number,
		endTime: number,
		channel: number = 0,
		outputNode: AudioNode,
		trackId: string
	): string {
		if (!this.audioContext) {
			console.warn('DrumSynthesizerService not initialized with AudioContext');
			return '';
		}

		const trackNode = TracksService.instance.getTrack(trackId);
		const drumType = this.getDrumTypeFromMidiNote(midiNote);
		
		// Get the specific preset for this MIDI note
		const presetName = MIDI_DRUM_MAPPING[midiNote];
		const drumParams = presetName ? 
			{...DEFAULT_KICK, ...ALL_DRUM_PRESETS[presetName]} : 
			this.getDrumParams(drumType);

		// Ensure timing is valid
		if (startTime < this.audioContext.currentTime - 0.001) {
			startTime = this.audioContext.currentTime;
		}

		const noteId = this.generateNoteId(midiNote, startTime, channel, trackId);
		const gain = this.velocityToGain(velocity) * drumParams.volume;

		try {
			const voice = this.createDrumVoice(
				drumType,
				drumParams,
				startTime,
				endTime,
				gain,
				outputNode,
				noteId,
				midiNote,
				trackId
			);

			if (voice) {
				this.activeVoices.set(noteId, voice);
				return noteId;
			}
			
		} catch (error) {
			console.error(`Failed to start drum ${drumType} on track ${trackId}:`, error);
		}
		
		return '';
	}

	private createDrumVoice(
		drumType: DrumType,
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		outputNode: AudioNode,
		noteId: string,
		midiNote: number,
		trackId: string
	): DrumVoice | null {
		if (!this.audioContext) return null;

		const oscillators: OscillatorNode[] = [];
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		const noteReleaseStart = endTime;
		const noteReleaseEnd = noteReleaseStart + params.release;

		// Create main gain node
		const ampGain = this.audioContext.createGain();
		ampGain.connect(outputNode);

		// Create filter if needed
		let filter: BiquadFilterNode | undefined;
		if (params.cutoff < 20000) {
			filter = this.audioContext.createBiquadFilter();
			filter.type = params.filterType;
			filter.Q.setValueAtTime(params.resonance, startTime);
			filter.connect(ampGain);
		}

		const output = filter || ampGain;

		switch (drumType) {
			case 'kick':
				return this.createKickDrum(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			case 'snare':
				return this.createSnareDrum(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			case 'hihat':
			case 'openhat':
				return this.createHiHat(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			case 'crash':
			case 'ride':
				return this.createCymbal(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			case 'tom':
				return this.createTom(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			case 'clap':
				return this.createClap(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			case 'rim':
				return this.createRim(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			case 'cowbell':
				return this.createCowbell(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
			default:
				return this.createKickDrum(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter);
		}
	}

	private createKickDrum(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Create main oscillator
		const osc = this.audioContext!.createOscillator();
		osc.type = params.waveform;
		osc.frequency.setValueAtTime(params.frequency * params.midiNoteStart, startTime);
		
		// MidiNote envelope - quick drop from high to low frequency
		const midiNoteDecayEnd = startTime + params.midiNoteDecay;
		osc.frequency.exponentialRampToValueAtTime(
			params.frequency * params.midiNoteEnd, 
			midiNoteDecayEnd
		);
		
		oscillators.push(osc);
		osc.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start oscillator
		osc.start(startTime);
		osc.stop(endTime);
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'kick'
		};
	}

	private createSnareDrum(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Create tone oscillator (for the "thud")
		const toneOsc = this.audioContext!.createOscillator();
		toneOsc.type = 'triangle';
		toneOsc.frequency.setValueAtTime(params.frequency, startTime);
		oscillators.push(toneOsc);
		
		// Create noise for the "snap"
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer && params.noiseLevel > 0) {
			noiseNode = this.audioContext!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
			noiseNode.loop = true;
		}
		
		// Mix tone and noise
		const mixer = this.audioContext!.createGain();
		const toneGain = this.audioContext!.createGain();
		const noiseGain = this.audioContext!.createGain();
		
		toneGain.gain.setValueAtTime(0.3, startTime);
		noiseGain.gain.setValueAtTime(params.noiseLevel, startTime);
		
		toneOsc.connect(toneGain);
		if (noiseNode) {
			noiseNode.connect(noiseGain);
		}
		
		toneGain.connect(mixer);
		noiseGain.connect(mixer);
		mixer.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
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
			noiseNode,
			gainNode: ampGain,
			filterNode: filter,
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'snare'
		};
	}

	private createHiHat(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Hi-hat is mostly filtered noise
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer) {
			noiseNode = this.audioContext!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
			noiseNode.loop = true;
		}
		
		// High-pass filter for brightness
		const hpFilter = this.audioContext!.createBiquadFilter();
		hpFilter.type = 'highpass';
		hpFilter.frequency.setValueAtTime(8000, startTime);
		hpFilter.Q.setValueAtTime(0.5, startTime);
		
		if (noiseNode) {
			noiseNode.connect(hpFilter);
		}
		hpFilter.connect(output);
		
		// Amplitude envelope - very quick attack and decay
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start noise
		if (noiseNode) {
			noiseNode.start(startTime);
			noiseNode.stop(endTime);
		}
		
		return {
			oscillators,
			noiseNode,
			gainNode: ampGain,
			filterNode: filter,
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'hihat'
		};
	}

	private createCymbal(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Cymbal is filtered noise with some tonal content
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer) {
			noiseNode = this.audioContext!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
			noiseNode.loop = true;
		}
		
		// Add some tonal content
		const osc1 = this.audioContext!.createOscillator();
		const osc2 = this.audioContext!.createOscillator();
		osc1.type = 'sine';
		osc2.type = 'sine';
		osc1.frequency.setValueAtTime(params.frequency, startTime);
		osc2.frequency.setValueAtTime(params.frequency * 1.5, startTime);
		
		oscillators.push(osc1, osc2);
		
		// Mix noise and oscillators
		const mixer = this.audioContext!.createGain();
		const noiseGain = this.audioContext!.createGain();
		const oscGain = this.audioContext!.createGain();
		
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
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
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
			noiseNode,
			gainNode: ampGain,
			filterNode: filter,
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'crash'
		};
	}

	private createTom(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Tom is a midiNoteed drum with midiNote envelope
		const osc = this.audioContext!.createOscillator();
		osc.type = params.waveform;
		osc.frequency.setValueAtTime(params.frequency * params.midiNoteStart, startTime);
		
		// MidiNote envelope - slower than kick
		const midiNoteDecayEnd = startTime + params.midiNoteDecay;
		osc.frequency.exponentialRampToValueAtTime(
			params.frequency * params.midiNoteEnd, 
			midiNoteDecayEnd
		);
		
		oscillators.push(osc);
		osc.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start oscillator
		osc.start(startTime);
		osc.stop(endTime);
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'tom'
		};
	}

	private createClap(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Clap is multiple noise bursts
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer) {
			noiseNode = this.audioContext!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
			noiseNode.loop = true;
		}
		
		// Create multiple noise bursts with slight delays
		const mixer = this.audioContext!.createGain();
		const delays = [0, 0.01, 0.02, 0.03]; // Multiple clap sounds
		
		delays.forEach((delay, index) => {
			const burstGain = this.audioContext!.createGain();
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
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start noise
		if (noiseNode) {
			noiseNode.start(startTime);
			noiseNode.stop(endTime);
		}
		
		return {
			oscillators,
			noiseNode,
			gainNode: ampGain,
			filterNode: filter,
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'clap'
		};
	}

	private createRim(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Rim shot is a short, bright click
		const osc = this.audioContext!.createOscillator();
		osc.type = 'square';
		osc.frequency.setValueAtTime(params.frequency, startTime);
		
		oscillators.push(osc);
		osc.connect(output);
		
		// Very short amplitude envelope
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
		ampGain.gain.exponentialRampToValueAtTime(0.001, endTime);
		
		// Start oscillator
		osc.start(startTime);
		osc.stop(endTime);
		
		return {
			oscillators,
			gainNode: ampGain,
			filterNode: filter,
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'rim'
		};
	}

	private createCowbell(
		params: DrumParams,
		startTime: number,
		endTime: number,
		gain: number,
		output: AudioNode,
		oscillators: OscillatorNode[],
		noteId: string,
		midiNote: number,
		trackId: string,
		ampGain: GainNode,
		filter?: BiquadFilterNode
	): DrumVoice {
		// Cowbell is a metallic, resonant sound
		const osc1 = this.audioContext!.createOscillator();
		const osc2 = this.audioContext!.createOscillator();
		osc1.type = 'square';
		osc2.type = 'triangle';
		osc1.frequency.setValueAtTime(params.frequency, startTime);
		osc2.frequency.setValueAtTime(params.frequency * 1.5, startTime);
		
		oscillators.push(osc1, osc2);
		
		// Mix oscillators
		const mixer = this.audioContext!.createGain();
		const osc1Gain = this.audioContext!.createGain();
		const osc2Gain = this.audioContext!.createGain();
		
		osc1Gain.gain.setValueAtTime(0.7, startTime);
		osc2Gain.gain.setValueAtTime(0.3, startTime);
		
		osc1.connect(osc1Gain);
		osc2.connect(osc2Gain);
		osc1Gain.connect(mixer);
		osc2Gain.connect(mixer);
		mixer.connect(output);
		
		// Amplitude envelope
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		
		ampGain.gain.setValueAtTime(0, startTime);
		ampGain.gain.linearRampToValueAtTime(gain, attackEnd);
		ampGain.gain.exponentialRampToValueAtTime(Math.max(gain * params.sustain, 0.001), decayEnd);
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
			noteId,
			endTime,
			midiNote,
			trackId,
			drumType: 'cowbell'
		};
	}

	private stopDrum(noteId: string, stopTime?: number): void {
		const voice = this.activeVoices.get(noteId);
		if (!voice) return;

		const currentTime = stopTime ?? this.audioContext!.currentTime;
		const drumParams = this.getTrackDrumParams(voice.trackId);
		const { release } = drumParams;

		// Cancel any scheduled changes and fade out smoothly
		voice.gainNode.gain.cancelScheduledValues(currentTime);
		voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, currentTime);
		voice.gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + release);

		// Stop oscillators
		voice.oscillators.forEach(osc => {
			try {
				osc.stop(currentTime + release);
			} catch (e) {
				// Already stopped
			}
		});

		// Stop noise if present
		if (voice.noiseNode) {
			try {
				voice.noiseNode.stop(currentTime + release);
			} catch (e) {
				// Already stopped
			}
		}

		voice.endTime = currentTime + release;
	}

	// ========================================================================================
	// Global Controls

	stopAllDrums(stopTime?: number): void {
		const currentTime = stopTime ?? this.audioContext!.currentTime;
		
		this.activeVoices.forEach((voice, noteId) => {
			this.stopDrum(noteId, currentTime);
		});
	}

	cleanup(): void {
		if (!this.audioContext) return;
		
		const currentTime = this.audioContext.currentTime;
		
		this.activeVoices.forEach((voice, noteId) => {
			if (currentTime > voice.endTime + 0.1) { // Small buffer
				this.activeVoices.delete(noteId);
			}
		});
	}

	// ========================================================================================
	// Utility

	private getDrumTypeFromMidiNote(midiNote: number): DrumType {
		const presetName = MIDI_DRUM_MAPPING[midiNote];
		if (presetName) {
			const drumType = presetName.split('-')[0] as DrumType;
			return drumType;
		}
		return 'kick'; // Default
	}

	private velocityToGain(velocity: number): number {
		return Math.pow(velocity / 127, 1.5); // Slightly curved response
	}

	private generateNoteId(midiNote: number, startTime: number, channel: number = 0, trackId: string): string {
		return `drum-${trackId}-${channel}-${midiNote}-${startTime.toFixed(6)}`;
	}

	getActiveVoiceCount(): number {
		return this.activeVoices.size;
	}

	getTrackActiveVoiceCount(trackId: string): number {
		let count = 0;
		this.activeVoices.forEach(voice => {
			if (voice.trackId === trackId) count++;
		});
		return count;
	}

	getActiveTrackIds(): string[] {
		const trackIds = new Set<string>();
		this.activeVoices.forEach(voice => {
			trackIds.add(voice.trackId);
		});
		return Array.from(trackIds);
	}
}

// ========================================================================================
// Drum Presets

export const DEFAULT_KICK: DrumParams = {
	waveform: 'sine',
	frequency: 60,
	detune: 0,
	noiseLevel: 0,
	noiseColor: 0.5,
	cutoff: 20000,
	resonance: 1,
	filterType: 'lowpass',
	attack: 0.001,
	decay: 0.3,
	sustain: 0.1,
	release: 0.1,
	midiNoteAttack: 0.001,
	midiNoteDecay: 0.1,
	midiNoteStart: 2.0,
	midiNoteEnd: 0.5,
	volume: 0.8,
	drive: 1.0
};

export const DRUM_PRESETS: Record<string, Partial<DrumParams>> = {
	// Kick Drums
	'kick': {
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
	'kick-deep': {
		waveform: 'sine',
		frequency: 45,
		attack: 0.001,
		decay: 0.4,
		sustain: 0.15,
		release: 0.15,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.15,
		midiNoteStart: 2.5,
		midiNoteEnd: 0.3,
		volume: 0.9
	},
	'kick-punchy': {
		waveform: 'sine',
		frequency: 70,
		attack: 0.001,
		decay: 0.2,
		sustain: 0.05,
		release: 0.05,
		midiNoteAttack: 0.001,
		midiNoteDecay: 0.05,
		midiNoteStart: 3.0,
		midiNoteEnd: 0.7,
		volume: 0.85
	},

	// Snare Drums
	'snare': {
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

	// Hi-Hats
	'hihat': {
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

	// Cymbals
	'crash': {
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
	'ride': {
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

	// Toms
	'tom': {
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

	// Clap
	'clap': {
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

	// Rim Shot
	'rim': {
		waveform: 'square',
		frequency: 400,
		attack: 0.001,
		decay: 0.05,
		sustain: 0.01,
		release: 0.02,
		volume: 0.6
	},

	// Cowbell
	'cowbell': {
		waveform: 'square',
		frequency: 800,
		attack: 0.001,
		decay: 0.1,
		sustain: 0.1,
		release: 0.1,
		volume: 0.5
	}
};
