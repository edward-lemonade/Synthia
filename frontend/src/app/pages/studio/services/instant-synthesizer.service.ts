import { Injectable } from '@angular/core';
import { MidiNote, MidiRegion, MidiTrackType } from '@shared/types';
import { ViewportService } from './viewport.service';
import { TracksService } from './tracks.service';
import { MidiSynthesizer, SynthParams, SynthVoice } from '@shared/audio-processing/synthesis/midi-synthesizer';
import { DrumParams, DrumSynthesizer, DrumVoice } from '@shared/audio-processing/synthesis/drum-synthesizer';


type Voice = SynthVoice | DrumVoice;
type Synthesizer = MidiSynthesizer | DrumSynthesizer;

@Injectable()
export class InstantSynthesizerService {
	private static _instance: InstantSynthesizerService;
	static get instance(): InstantSynthesizerService { return InstantSynthesizerService._instance; }

	// Synthesizers
	declare midiSynthesizer: MidiSynthesizer;
	declare drumSynthesizer: DrumSynthesizer;
	
	private audioContext?: AudioContext;
	private activeVoices = new Map<string, Voice>();
	
	constructor(
		public viewportService: ViewportService,
	) {
		InstantSynthesizerService._instance = this;
		this.midiSynthesizer = new MidiSynthesizer(this.viewportService.posToTime);
		this.drumSynthesizer = new DrumSynthesizer(this.viewportService.posToTime);
	}

	initializeAudioContext(audioContext: AudioContext) {this.audioContext = audioContext;}

	// ========================================================================================
	// Note Controls
	
	createMidiSource(
		midiData: MidiNote, 
		trackId: string,
		trackType: MidiTrackType,
	) {
		const noteIds: string[] = [];
		let isConnected = false;
		let outputNode: AudioNode;

		return {
			notes: [midiData],
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
				
				this.startNote(trackType, midiData, outputNode, trackId)
			},
			stop: (when?: number) => {				
				const stopTime = when ?? this.audioContext!.currentTime;
				this.stopNotes(noteIds, trackType, stopTime);
			},	
			noteIds
		};
	}

	private startNote(
		trackType: MidiTrackType,
		note: MidiNote,
		outputNode: AudioNode,
		trackId: string,
	) {
		const newNote = {...note, start: 0, duration: 0.3};
		const actualStartTime = this.audioContext!.currentTime;
		const actualEndTime = actualStartTime + newNote.duration;

		const voice = this.startNoteByType(
			trackType, 
			newNote, 
			actualStartTime,
			actualEndTime,
			outputNode, 
			trackId
		);

		if (voice) {
			const noteId = this.generateNoteId(note.midiNote, actualStartTime, 0, trackId);
			
			// Add cleanup event listener
			const endedHandler = () => {this.activeVoices.delete(noteId);};
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

			this.activeVoices.set(noteId, voice);
		}
	}

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
				this.getSynthParams(trackId),
				note,
				startTime,
				endTime,
			);
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
					this.getSynthParams(synthVoice.trackId!), 
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
				this.midiSynthesizer.stopNote(synthVoice, this.getSynthParams(synthVoice.trackId!), currentTime);
			} else {
				const drumVoice = voice as DrumVoice;
				this.drumSynthesizer.stopNote(drumVoice, this.getDrumParams(drumVoice.midiNote), currentTime);
			}
		});

		//this.cleanup(audioContext); i dont think this is needed since active voices already get deleted onEnded
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

	getSynthParams(trackId: string): SynthParams {
		const instrument = TracksService.instance.getTrack(trackId)?.instrument();
		return this.midiSynthesizer.getSynthParams(instrument ?? '');
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