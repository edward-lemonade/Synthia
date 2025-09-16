import { Injectable } from '@angular/core';
import { MidiNote, MidiRegion, MidiTrackType } from '@shared/types';
import { ViewportService } from './viewport.service';
import { TracksService } from './tracks.service';

// MIDI Synthesizer imports
import { MidiSynthesizer, SynthParams, SynthVoice } from '@shared/audio-processing/synthesis/midi-synthesizer';
import { DEFAULT_SYNTH, SYNTHS } from '@shared/audio-processing/synthesis/presets/instruments';

// Drum Synthesizer imports
import { DrumSynthesizer, DrumParams, DrumVoice, DrumType } from '@shared/audio-processing/synthesis/drum-synthesizer';
import { DRUM_PRESETS, DEFAULT_KICK, MIDI_DRUM_MAPPING } from "@shared/audio-processing/synthesis/presets/drums";

export interface MidiSource {
	notes: MidiNote[];
	connect: (destination: AudioNode) => void;
	start: (when?: number, offset?: number, duration?: number) => void;
	stop: (when?: number) => void;
	noteIds: string[];
	trackId?: string;
}

export interface TrackSynthConfig {
	trackId: string;
	synthParams: SynthParams;
	preset?: string;
}

export interface TrackDrumConfig {
	trackId: string;
	drumParams: DrumParams;
	preset?: string;
}

type Voice = SynthVoice | DrumVoice;
type Synthesizer = MidiSynthesizer | DrumSynthesizer;

@Injectable()
export class SynthesizerService {
	private static _instance: SynthesizerService;
	static get instance(): SynthesizerService { return SynthesizerService._instance; }

	// Synthesizers
	declare midiSynthesizer: MidiSynthesizer;
	declare drumSynthesizer: DrumSynthesizer;
	
	private audioContext?: AudioContext;
	private activeVoices = new Map<string, Voice>();
	
	constructor(
		public viewportService: ViewportService,
	) {
		SynthesizerService._instance = this;
	}

	initialize(audioContext: AudioContext) {
		this.audioContext = audioContext;
		this.midiSynthesizer = new MidiSynthesizer(this.viewportService.posToTime);
		this.drumSynthesizer = new DrumSynthesizer(this.viewportService.posToTime);
	}

	// ========================================================================================
	// MIDI Source Creation (Shared)

	createMidiSource(
		midiData: MidiNote[], 
		regionStartTime: number, 
		regionDuration: number,
		trackId: string,
		trackType: MidiTrackType,
		offline: boolean = false,
		offlineAudioContext?: OfflineAudioContext,
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
					console.warn(`${trackType} MIDI source not connected to output`);
					return;
				}

				const actualDuration = duration ?? regionDuration;
				const endTime = when + actualDuration;
				
				if (offline) {	
					this.processNotesOffline(
						offlineAudioContext!,
						midiData,
						when,
						offset,
						endTime,
						outputNode,
						trackId,
						trackType,
						noteIds
					);
				} else {
					this.processNotesRealtime(
						midiData,
						when,
						offset,
						endTime,
						outputNode,
						trackId,
						trackType,
						noteIds
					);
				}
			},
			stop: (when?: number) => {
				if (offline) {
					return;
				}
				
				const stopTime = when ?? this.audioContext!.currentTime;
				this.stopNotes(noteIds, trackType, stopTime);
			},	
			noteIds
		};
	}

	// ========================================================================================
	// Note Processing (Shared Logic)

	private processNotesRealtime(
		midiData: MidiNote[],
		when: number,
		offset: number,
		endTime: number,
		outputNode: AudioNode,
		trackId: string,
		trackType: MidiTrackType,
		noteIds: string[]
	): void {
		midiData.forEach((note) => {
			const timing = this.calculateNoteTiming(note, when, offset, endTime);
			if (!timing) return;

			const { actualStartTime, actualEndTime } = timing;
			
			// Start the note based on track type
			const voice = this.startNoteByType(
				trackType,
				note,
				actualStartTime,
				actualEndTime,
				outputNode,
				trackId
			);

			if (voice) {
				const noteId = this.generateNoteId(note.midiNote, actualStartTime, 0, trackId);
				noteIds.push(noteId);
				
				// Add cleanup event listener
				this.addVoiceCleanupListener(voice, noteId, trackType);
				this.activeVoices.set(noteId, voice);
			}
		});
	}

	private processNotesOffline(
		offlineAudioContext: OfflineAudioContext,
		midiData: MidiNote[],
		when: number,
		offset: number,
		endTime: number,
		outputNode: AudioNode,
		trackId: string,
		trackType: MidiTrackType,
		noteIds: string[]
	): void {
		midiData.forEach((note) => {
			const timing = this.calculateNoteTiming(note, when, offset, endTime);
			if (!timing) return;

			const { actualStartTime, actualEndTime } = timing;
			
			// Start the note based on track type
			const voice = this.startNoteByTypeOffline(
				trackType,
				note,
				actualStartTime,
				actualEndTime,
				outputNode,
				trackId,
				offlineAudioContext
			);
			
			if (voice) {
				const noteId = this.generateNoteId(note.midiNote, actualStartTime, 0, trackId);
				noteIds.push(noteId);
			}
		});
	}

	private calculateNoteTiming(
		note: MidiNote, 
		when: number, 
		offset: number, 
		endTime: number
	): { actualStartTime: number; actualEndTime: number } | null {
		const noteStartTime = when + ViewportService.instance.posToTime(note.start) - offset;
		const noteEndTime = noteStartTime + ViewportService.instance.posToTime(note.duration);

		// Skip notes outside playback range
		if (noteEndTime <= when || noteStartTime >= endTime) {
			return null;
		}
		
		// Adjust timing for partial playback
		const actualStartTime = Math.max(noteStartTime, when);
		const actualEndTime = Math.min(noteEndTime, endTime);
		const actualNoteDuration = actualEndTime - actualStartTime;
		
		// Minimum 1ms duration
		if (actualNoteDuration <= 0.001) {
			return null;
		}

		return { actualStartTime, actualEndTime };
	}

	// ========================================================================================
	// Note Starting (Type-Specific)

	private startNoteByType(
		trackType: MidiTrackType,
		note: MidiNote,
		startTime: number,
		endTime: number,
		outputNode: AudioNode,
		trackId: string
	): Voice | null {
		if (trackType === MidiTrackType.Drums) {
			return this.drumSynthesizer.startNote(
				this.audioContext!,
				outputNode,
				this.getDrumParams(note.midiNote),
				note,
				startTime,
				endTime,
			);
		} else {
			return this.midiSynthesizer.startNote(
				this.audioContext!,
				outputNode,
				this.getTrackSynthParams(trackId),
				note,
				startTime,
				endTime,
			);
		}
	}

	private startNoteByTypeOffline(
		trackType: MidiTrackType,
		note: MidiNote,
		startTime: number,
		endTime: number,
		outputNode: AudioNode,
		trackId: string,
		offlineAudioContext: OfflineAudioContext
	): Voice | null {
		if (trackType === MidiTrackType.Drums) {
			return this.drumSynthesizer.startNote(
				offlineAudioContext,
				outputNode,
				this.getDrumParams(note.midiNote),
				note,
				startTime,
				endTime,
			);
		} else {
			return this.midiSynthesizer.startNote(
				offlineAudioContext,
				outputNode,
				this.getTrackSynthParams(trackId),
				note,
				startTime,
				endTime,
			);
		}
	}

	// ========================================================================================
	// Voice Management

	private addVoiceCleanupListener(voice: Voice, noteId: string, trackType: MidiTrackType): void {
		const endedHandler = () => {
			this.activeVoices.delete(noteId);
		};

		if (trackType === 'drums') {
			const drumVoice = voice as DrumVoice;
			if (drumVoice.oscillators[0]) {
				drumVoice.oscillators[0].addEventListener('ended', endedHandler);
			} else if (drumVoice.noiseNode) {
				drumVoice.noiseNode.addEventListener('ended', endedHandler);
			}
		} else {
			const synthVoice = voice as SynthVoice;
			synthVoice.oscillators[0]?.addEventListener('ended', endedHandler);
		}
	}

	private stopNotes(noteIds: string[], trackType: MidiTrackType, stopTime: number): void {
		noteIds.forEach(noteId => {
			const voice = this.activeVoices.get(noteId);
			if (!voice) return;

			if (trackType === 'drums') {
				const drumVoice = voice as DrumVoice;
				this.drumSynthesizer.stopNote(
					drumVoice, 
					this.getDrumParams(drumVoice.midiNote), 
					stopTime
				);
			} else {
				const synthVoice = voice as SynthVoice;
				this.midiSynthesizer.stopNote(
					synthVoice, 
					this.getTrackSynthParams(synthVoice.trackId!), 
					stopTime
				);
			}
		});
	}

	// ========================================================================================
	// Global Controls

	stopAllNotes(stopTime?: number): void {
		const currentTime = stopTime ?? this.audioContext!.currentTime;
		
		this.activeVoices.forEach((voice, noteId) => {
			if ('trackId' in voice && voice.trackId) {
				const synthVoice = voice as SynthVoice;
				this.midiSynthesizer.stopNote(synthVoice, this.getTrackSynthParams(synthVoice.trackId!), currentTime);
			} else {
				const drumVoice = voice as DrumVoice;
				this.drumSynthesizer.stopNote(drumVoice, this.getDrumParams(drumVoice.midiNote), currentTime);
			}
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
	// Parameter Management

	getTrackSynthParams(trackId: string): SynthParams {
		const instrument = TracksService.instance.getTrack(trackId)?.instrument();
		return instrument ? this.getSynthParams(instrument) : { ...DEFAULT_SYNTH };
	}
	getSynthParams(instrument: string): SynthParams {
		return {...DEFAULT_SYNTH, ...SYNTHS[instrument] ?? {}}
	}

	getDrumParams(midiNote: number): DrumParams {
		return this.drumSynthesizer.getDrumParams(this.drumSynthesizer.getDrumTypeFromMidiNote(midiNote));
	}

	// ========================================================================================
	// Utility

	private generateNoteId(midiNote: number, startTime: number, channel: number = 0, trackId: string): string {
		return `${trackId}-${channel}-${midiNote}-${startTime.toFixed(6)}`;
	}
}