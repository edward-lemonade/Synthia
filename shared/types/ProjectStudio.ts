import { ProjectMetadata } from "./ProjectMetadata";

import { Automation, Globals, Tracks } from "./studio";

export interface ProjectStudio { // inner project data, accessible only to authors
	metadata: ProjectMetadata;
	globals: Globals;
	tracks: Tracks;
	//automations: Automation[];
}