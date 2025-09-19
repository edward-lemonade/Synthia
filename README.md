# Synthia
Started in July, still WIP and will be actively updated moving forward. Has lots of bugs/limitations but is usable and fun to play with.

https://synthia-f.vercel.app/

&nbsp;

## Technologies
* **Angular 20**: frontend framework
* **Vercel**: frontend hosting
* **Google Cloud**: backend
    * I would have hosted backend on Vercel too but I would have to refactor the code to use serverless functions and buy Redis integrations which is unideal. Will eventually migrate both frontend and backend to a different provider.
* **MongoDB**: storing user, project data, social interactions 
    * Atlas Search used in Discover tab's search feature
* **AWS**: large files (audio exports / profile pictures)
* **Redis**: audio file cache (dramatic improvement in audio loading, main bottleneck is just decoding on frontend)
* **Auth0**: user authentication + JWT validation

Would love to migrate everything in the future, especially moving backend to Vercel or AWS, and maybe try Mongo's GridFS for images and audio?

&nbsp;

## Current features
#### DAW (Digital Audio Workstation)
* Audio file imports
* MIDI editor
* Premade instrument and drum synths
* Mutable/soloable tracks
* Reverb, pan, and volume control on tracks 
* BPM, time signature, key
* Undo/redo 
* Export into WAV or MP3
* Box select

![image](/imgs/studio_page.png)

#### Community features
* Customizable profile
* Publish and unpublish projects
* Discover other people's projects (sort by "hottest" or "newest")
* Profile page displays user's published projects
* Search bar, can be used to search songs and users by keyword
* Leave likes and comments on other peoples' projects

![image](/imgs/discover_page.png)
![image](/imgs/released_track.png)

&nbsp;

## Limitations and future plans
#### High priority
* DO NOT IMPORT LARGE AUDIO FILES 
	* Backend cannot safely transfer resulting project .WAV export to the frontend
    * I will look into streaming or pagination to handle this
    * High priority
* Will implement streaming rather than sending entire array buffer to frontend to decode
    * Should drastically decrease project loading time since decoding on the browser is the biggest bottleneck
* Will refactor code to route all API requests through an ApiService (clean and centralized)
* Cleanup /shared folder (waveform generation is currently not done on backend so can be moved to frontend)
#### Future DAW features
* keybinds
* duplicating multiple regions at a time
* fix microphone recording (hard to test at the moment because my laptop's mic is buggy)
* more synths
* weird resonance and clashing between midi notes
* automations and effects (far future)
#### Future community features
* follow/friend system
* suggested tracks

&nbsp;

## Cool problems I had to solve
### State store in studio page (the DAW itself)

I wanted to use a "tree" state with deeply nested hierarchies as opposed to a flattened, normalized state store like NgRx, since it felt more intuitive and better represented the structure of the project state itself. I did this by extending Angular signals to create a **"StateNode"**.

* Ex: ```state.metadata.tracks.get(2).regions.get(8).midiData.get(200).velocity.set(4)```
* Ex: ```state.metadata.tracks.get(2).regions.insert(newRegion)```

**StateNode is an Angular Signal with parent/child pointers, overridden mutators, and custom ids + helper functions.**
* Handles intuitive composition and parent/child relationships between state variables
* Handles history tracking by overriding Angular's default signal mutators (set and update) to store callbacks in a stack because:
    * Immer patches don't work for my state nodes. 
    * Allows for grouped changes where changes to one variable affects a multitude of others (changing BPM affects audio region length etc). All associated changes will be saved as one synced change in the history tracker, *which is impossible with Angular effects in my case*.
* Handles deeply nested arrays. I can easily swap elements from one parent to another just by passing the nodes around. (Immutability > Recreating objects)
* Handles conversions to and from JSON. A factory function constructs the tree state from JSON, filling in default values if needed. Conversely, the tree state can instantly be snapshotted back into a JSON for the backend.
* Handles visual reactivity since  it inherits the properties of Angular signals.
    * I can reap the rewards of Angular's computed(), effect(), and ngModel.
* Less boilerplate than NgRx

My StateNode is better tailored for my needs and better represents the project state than NgRx or any other normalized state store, without compromising efficiency or introducing too much complexity/boilerplate :)
