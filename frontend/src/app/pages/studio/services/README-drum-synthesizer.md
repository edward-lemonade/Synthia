# Drum Synthesizer Service

The `DrumSynthesizerService` provides real-time drum synthesis capabilities for the NoteFlyte studio. It supports various drum types with authentic synthesis techniques.

## Features

- **Real-time drum synthesis** using Web Audio API
- **Multiple drum types**: Kick, Snare, Hi-Hat, Crash, Ride, Tom, Clap, Rim, Cowbell
- **Drum-specific synthesis techniques**:
  - Kick drums: Pitch envelope synthesis
  - Snare drums: Tone + filtered noise
  - Hi-hats: High-pass filtered noise
  - Cymbals: Noise + tonal content
  - Toms: Pitched drums with pitch envelopes
  - Claps: Multiple noise bursts
- **Extensive preset library** with 30+ drum sounds
- **General MIDI compatibility** with automatic drum mapping
- **Track-based configuration** for per-track drum settings

## Usage

### Basic Setup

```typescript
import { DrumSynthesizerService } from './drum-synthesizer.service';

// Initialize with audio context
await DrumSynthesizerService.instance.initialize(audioContext);

// Create MIDI source for drum track
const midiSource = DrumSynthesizerService.instance.createMidiSource(
  midiNotes,
  regionStartTime,
  regionDuration,
  trackId
);

// Connect to audio output
midiSource.connect(outputNode);

// Start playback
midiSource.start();
```

### Track Configuration

```typescript
// Set drum parameters for a track
DrumSynthesizerService.instance.setTrackDrumParams(trackId, {
  frequency: 60,
  attack: 0.001,
  decay: 0.3,
  volume: 0.8
});

// Apply a preset
DrumSynthesizerService.instance.applyTrackPreset(trackId, 'kick-808');
```

### Drum Types and MIDI Mapping

The service automatically maps MIDI notes to drum types using General MIDI standard:

- **Kick Drums**: MIDI notes 35-36
- **Snare Drums**: MIDI notes 37-40
- **Hi-Hats**: MIDI notes 42, 44, 46
- **Cymbals**: MIDI notes 49-57
- **Toms**: MIDI notes 41, 43, 45, 47, 48, 50
- **Percussion**: MIDI notes 39, 56-81

## Presets

### Kick Drums
- `kick-classic`: Standard acoustic kick
- `kick-808`: Deep 808-style kick
- `kick-punchy`: Tight, punchy kick
- `kick-electronic`: Electronic kick with sharp attack

### Snare Drums
- `snare-classic`: Standard acoustic snare
- `snare-tight`: Tight, crisp snare
- `snare-fat`: Deep, fat snare
- `snare-rimshot`: Bright rim shot

### Hi-Hats
- `hihat-closed`: Closed hi-hat
- `hihat-open`: Open hi-hat
- `hihat-crispy`: Bright, crispy hi-hat
- `hihat-dark`: Dark, muffled hi-hat

### Cymbals
- `crash-classic`: Standard crash cymbal
- `crash-splash`: Short splash cymbal
- `ride-classic`: Standard ride cymbal
- `ride-bell`: Bright ride bell

### Toms
- `tom-high`: High tom
- `tom-mid`: Mid tom
- `tom-low`: Low tom
- `tom-floor`: Floor tom

### Percussion
- `clap-classic`: Hand clap
- `clap-double`: Double clap
- `rimshot`: Rim shot
- `cowbell`: Cowbell
- `woodblock`: Wood block
- `tambourine`: Tambourine

## Integration with MIDI Synthesizer

The drum synthesizer is automatically integrated with the main `MidiSynthesizerService`. When a track is set to `MidiTrackType.Drums`, the system automatically routes MIDI data to the drum synthesizer instead of the melodic synthesizer.

## Drum Synthesis Techniques

### Kick Drums
- Uses sine wave oscillator with pitch envelope
- Quick pitch drop from high to low frequency
- Short attack, medium decay
- Sub-bass frequencies (45-70 Hz)

### Snare Drums
- Combines tone oscillator (triangle wave) with filtered noise
- High-pass filtered noise for the "snap"
- Medium attack, quick decay
- Frequency range: 150-300 Hz for tone

### Hi-Hats
- Primarily filtered noise
- High-pass filter for brightness
- Very short attack and decay
- High frequency content (8-15 kHz)

### Cymbals
- Mix of noise and tonal content
- Band-pass filtering for metallic character
- Long decay with sustain
- Wide frequency spectrum

### Toms
- Pitched drums with pitch envelope
- Slower pitch drop than kick drums
- Medium attack and decay
- Frequency range: 60-200 Hz

## Performance Considerations

- **Voice Management**: Automatic cleanup of finished voices
- **Memory Efficient**: Reuses noise buffer for multiple voices
- **Low Latency**: Optimized for real-time performance
- **CPU Friendly**: Efficient synthesis algorithms

## API Reference

### DrumSynthesizerService

#### Methods
- `initialize(audioContext: AudioContext)`: Initialize the service
- `createMidiSource(midiData, regionStartTime, regionDuration, trackId)`: Create MIDI source
- `setTrackDrumParams(trackId, params)`: Set drum parameters for track
- `applyTrackPreset(trackId, presetName)`: Apply preset to track
- `getTrackDrumParams(trackId)`: Get current drum parameters
- `stopAllDrums(stopTime?)`: Stop all active drum voices
- `cleanup()`: Clean up finished voices

#### Properties
- `activeVoices`: Map of active drum voices
- `trackDrumConfigs`: Map of track-specific configurations

### DrumParams Interface

```typescript
interface DrumParams {
  // Oscillator settings
  waveform: OscillatorType;
  frequency: number;
  detune: number;
  
  // Noise settings
  noiseLevel: number;
  noiseColor: number;
  
  // Filter settings
  cutoff: number;
  resonance: number;
  filterType: BiquadFilterType;
  
  // Envelope settings
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  
  // Pitch envelope
  pitchAttack: number;
  pitchDecay: number;
  pitchStart: number;
  pitchEnd: number;
  
  // Master settings
  volume: number;
  drive: number;
}
```

## Examples

### Creating a Custom Kick Drum

```typescript
const customKickParams: Partial<DrumParams> = {
  frequency: 50,
  attack: 0.001,
  decay: 0.4,
  sustain: 0.1,
  release: 0.2,
  pitchAttack: 0.001,
  pitchDecay: 0.15,
  pitchStart: 2.5,
  pitchEnd: 0.4,
  volume: 0.9
};

DrumSynthesizerService.instance.setTrackDrumParams(trackId, customKickParams);
```

### Using Presets

```typescript
// Apply 808 kick preset
DrumSynthesizerService.instance.applyTrackPreset(trackId, 'kick-808');

// Apply tight snare preset
DrumSynthesizerService.instance.applyTrackPreset(trackId, 'snare-tight');
```

### MIDI Note to Drum Mapping

```typescript
import { MIDI_DRUM_MAPPING } from './drum-presets';

// Get preset for MIDI note 36 (Bass Drum 1)
const preset = MIDI_DRUM_MAPPING[36]; // Returns 'kick-808'
DrumSynthesizerService.instance.applyTrackPreset(trackId, preset);
```
