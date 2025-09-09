import { Injectable } from '@angular/core';
import { MidiNote, MidiRegion } from '@shared/types';
import { ViewportService } from '../viewport.service';
import { TracksService } from '../tracks.service';
import { ObjectStateNode } from '../../state/state.factory';
import { MidiSource } from './midi-synthesizer.service';
import { DRUM_PRESETS, DEFAULT_KICK, MIDI_DRUM_MAPPING } from "@shared/audio-processing/synthesis/presets/drums";

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
		this.noiseBuffer = await this.generateNoiseBuffer(audioContext) ?? undefined;
	}

	// ========================================================================================
	// MIDI Source Creation

	createMidiSource(
		midiData: MidiNote[], 
		regionStartTime: number, 
		regionDuration: number,
		trackId: string,
		offline: boolean = false,
		offlineContext?: OfflineAudioContext,
	): MidiSource {
		const audioContext = offline ? offlineContext! : this.audioContext!;

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
				
				if (offline) {	
					this.processNotesOffline(
						audioContext as OfflineAudioContext,
						midiData,
						when,
						offset,
						endTime,
						outputNode,
						trackId,
						noteIds
					);
				} else {
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
								trackId,
								offline,
								audioContext
							);
							
							if (noteId) {
								noteIds.push(noteId);
							}
						}
					});
				}
			},
			
			stop: (when?: number) => {
				if (offline) {
					// For offline rendering, stopping is not applicable
					return;
				}
				
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

	private processNotesOffline(
		offlineContext: OfflineAudioContext,
		midiData: MidiNote[],
		when: number,
		offset: number,
		endTime: number,
		outputNode: AudioNode,
		trackId: string,
		noteIds: string[]
	): void {
		midiData.forEach((note) => {
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
					trackId,
					true, // offline = true
					offlineContext
				);
				
				if (noteId) {
					noteIds.push(noteId);
				}
			}
		});
	}

	private async generateNoiseBuffer(audioContext?: AudioContext | OfflineAudioContext): Promise<AudioBuffer | null> {
		const ctx = audioContext || this.audioContext;
		if (!ctx) return null;
		
		const bufferSize = ctx.sampleRate * 2; // 2 seconds
		const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const output = noiseBuffer.getChannelData(0);
		
		for (let i = 0; i < bufferSize; i++) {
			output[i] = Math.random() * 2 - 1;
		}
		
		return noiseBuffer;
	}

	private startDrum(
		midiNote: number, 
		velocity: number, 
		startTime: number,
		endTime: number,
		channel: number = 0,
		outputNode: AudioNode,
		trackId: string,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): string {
		const ctx = audioContext || this.audioContext!;
		
		if (!ctx) {
			console.warn('DrumSynthesizerService not initialized with AudioContext');
			return '';
		}

		const trackNode = TracksService.instance.getTrack(trackId);
		const drumType = this.getDrumTypeFromMidiNote(midiNote);
		
		// Get the specific preset for this MIDI note
		const presetName = MIDI_DRUM_MAPPING[midiNote];
		const drumParams = presetName ? 
			{...DEFAULT_KICK, ...DRUM_PRESETS[presetName]} : 
			this.getDrumParams(drumType);

		// For realtime, adjust start time if in the past
		if (!offline && startTime < ctx.currentTime - 0.001) {
			startTime = ctx.currentTime;
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
				trackId,
				offline,
				ctx
			);

			// Only track voices for realtime playback
			if (voice && !offline) {
				this.activeVoices.set(noteId, voice);

				if (!offline) {
					const osc = voice.oscillators[0] ?? null;
					osc?.addEventListener('ended', () => {
						this.activeVoices.delete(noteId);
					});
				}
			}
			
			return noteId;
			
		} catch (error) {
			console.error(`Failed to start drum ${drumType} on track ${trackId}:`, error);
			return '';
		}
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
		trackId: string,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice | null {
		const ctx = audioContext || this.audioContext!;
		if (!ctx) return null;

		const oscillators: OscillatorNode[] = [];
		const attackEnd = startTime + params.attack;
		const decayEnd = attackEnd + params.decay;
		const noteReleaseStart = endTime;
		const noteReleaseEnd = noteReleaseStart + params.release;

		// Create main gain node
		const ampGain = ctx.createGain();
		ampGain.connect(outputNode);

		// Create filter if needed
		let filter: BiquadFilterNode | undefined;
		if (params.cutoff < 20000) {
			filter = ctx.createBiquadFilter();
			filter.type = params.filterType;
			filter.Q.setValueAtTime(params.resonance, startTime);
			filter.connect(ampGain);
		}

		const output = filter || ampGain;

		switch (drumType) {
			case 'kick':
				return this.createKickDrum(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			case 'snare':
				return this.createSnareDrum(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			case 'hihat':
			case 'openhat':
				return this.createHiHat(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			case 'crash':
			case 'ride':
				return this.createCymbal(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			case 'tom':
				return this.createTom(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			case 'clap':
				return this.createClap(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			case 'rim':
				return this.createRim(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			case 'cowbell':
				return this.createCowbell(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
			default:
				return this.createKickDrum(params, startTime, noteReleaseEnd, gain, output, oscillators, noteId, midiNote, trackId, ampGain, filter, offline, ctx);
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;
		
		// Create main oscillator
		const osc = ctx!.createOscillator();
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;

		// Create tone oscillator (for the "thud")
		const toneOsc = ctx!.createOscillator();
		toneOsc.type = 'triangle';
		toneOsc.frequency.setValueAtTime(params.frequency, startTime);
		oscillators.push(toneOsc);
		
		// Create noise for the "snap"
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer && params.noiseLevel > 0) {
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
			noiseNode.loop = true;
		}
		
		// Mix tone and noise
		const mixer = ctx!.createGain();
		const toneGain = ctx!.createGain();
		const noiseGain = ctx!.createGain();
		
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;
		
		// Hi-hat is mostly filtered noise
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer) {
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
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

		if (!offline) {
			noiseNode?.addEventListener('ended', () => {
				this.activeVoices.delete(noteId);
			});
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;
		
		// Cymbal is filtered noise with some tonal content
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer) {
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
			noiseNode.loop = true;
		}
		
		// Add some tonal content
		const osc1 = ctx!.createOscillator();
		const osc2 = ctx!.createOscillator();
		osc1.type = 'sine';
		osc2.type = 'sine';
		osc1.frequency.setValueAtTime(params.frequency, startTime);
		osc2.frequency.setValueAtTime(params.frequency * 1.5, startTime);
		
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;

		// Tom is a midiNoteed drum with midiNote envelope
		const osc = ctx!.createOscillator();
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;
		
		// Clap is multiple noise bursts
		let noiseNode: AudioBufferSourceNode | undefined;
		if (this.noiseBuffer) {
			noiseNode = ctx!.createBufferSource();
			noiseNode.buffer = this.noiseBuffer;
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;
		
		// Rim shot is a short, bright click
		const osc = ctx!.createOscillator();
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
		filter?: BiquadFilterNode,
		offline: boolean = false,
		audioContext?: AudioContext | OfflineAudioContext
	): DrumVoice {
		const ctx = audioContext || this.audioContext!;
		
		// Cowbell is a metallic, resonant sound
		const osc1 = ctx!.createOscillator();
		const osc2 = ctx!.createOscillator();
		osc1.type = 'square';
		osc2.type = 'triangle';
		osc1.frequency.setValueAtTime(params.frequency, startTime);
		osc2.frequency.setValueAtTime(params.frequency * 1.5, startTime);
		
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
	// Track Management

	setTrackDrumParams(trackId: string, params: Partial<DrumParams>) {
		const existingParams = this.trackDrumConfigs.get(trackId) || { ...DEFAULT_KICK };
		const newParams = { ...existingParams, ...params };
		this.trackDrumConfigs.set(trackId, newParams);
	}

	applyTrackPreset(trackId: string, presetName: string) {
		const preset = DRUM_PRESETS[presetName];
		if (preset) {
			this.trackDrumConfigs.set(trackId, {...DEFAULT_KICK, ...preset });
		}
	}

	getTrackDrumParams(trackId: string): DrumParams {
		return this.trackDrumConfigs.get(trackId) || { ...DEFAULT_KICK };
	}

	getDrumParams(drumType: DrumType): DrumParams {
		return {...DEFAULT_KICK, ...DRUM_PRESETS[drumType] ?? {}}
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