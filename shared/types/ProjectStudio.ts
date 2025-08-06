import { ProjectMetadata } from "./ProjectMetadata";

import { Track, Automation, Globals } from "./studio";

export interface ProjectStudio { // inner project data, accessible only to authors
	metadata: ProjectMetadata;
	globals: Globals;
	tracks: Track[];
	//automations: Automation[];
}