import { Client, RunTree } from "langsmith"
export type { RunTree } // ADDED: Export RunTree type
// LANGSMITH_TRACING_V2=true is usually what the JS SDK client checks for.
// The plan mentioned LANGSMITH_TRACING=true, this might need alignment later
// if issues arise, but the Client constructor handles these internally.

// Configuration for LangSmith client
interface LangSmithConfig {
	apiKey?: string
	projectName?: string
}

// Store configuration without initializing client
let langSmithConfig: LangSmithConfig = {}
let clientInstance: Client | null = null

/**
 * Configure the LangSmith client with API key and project name.
 * This should be called before any LangSmith operations.
 * @param config Configuration options for LangSmith
 */
export function configureLangSmith(config: LangSmithConfig): void {
	langSmithConfig = { ...config }
	// Always reset client instance so it will be recreated with new config
	clientInstance = null
}

/**
 * Gets or creates a LangSmith client instance.
 * This lazy initialization avoids circular dependency with the API key.
 * @returns The LangSmith client instance
 */
export function getClient(): Client {
	if (!clientInstance) {
		if (langSmithConfig.apiKey) {
			// Create client with explicit config if available
			clientInstance = new Client({
				apiKey: langSmithConfig.apiKey,
			})
		} else {
			// Fall back to environment variables
			clientInstance = new Client()
		}
	}
	return clientInstance
}

export interface TaskRunMetadata {
	taskId: string
	model?: string
	temperature?: number
	workspace?: string
	// [key: string]: any; // Allow other arbitrary metadata
}

export interface ChildRunInputs {
	[key: string]: any
}

export interface RunOutputs {
	[key: string]: any
}

/**
 * Starts a new root run for a task.
 * @param metadata - Metadata for the task run.
 * @returns The RunTree instance for the created run.
 */
export async function startTaskRun(metadata: TaskRunMetadata): Promise<RunTree> {
	const runName = `Task-${metadata.taskId}`
	const run = (await getClient().createRun({
		name: runName,
		run_type: "chain", // Using "chain" as a general type for a multi-step task
		inputs: { ...metadata },
		// extra: { metadata: { ...metadata } } // Alternative way to pass metadata
	})) as unknown as RunTree
	return run
}

/**
 * Starts a new child run nested under a parent run.
 * @param parentRun - The parent RunTree instance.
 * @param name - The name for the child run.
 * @param runType - The type of the child run (e.g., "llm", "tool", "chain").
 * @param inputs - The inputs for the child run.
 * @returns The RunTree instance for the created child run.
 */
export async function startChildRun(
	parentRun: RunTree,
	name: string,
	runType: "llm" | "tool" | "chain" | string,
	inputs: ChildRunInputs,
): Promise<RunTree> {
	const childRun = (await parentRun.createChild({
		name,
		run_type: runType,
		inputs,
	})) as unknown as RunTree
	return childRun
}

/**
 * Ends a run, optionally with outputs or an error.
 * @param run - The RunTree instance to end.
 * @param params - An object containing optional outputs or an error.
 */
export async function endRun(run: RunTree, params: { outputs?: RunOutputs; error?: any }): Promise<void> {
	try {
		if (params.error) {
			const errorMessage = params.error instanceof Error ? params.error.message : String(params.error)
			await run.end({ error: errorMessage })
		} else {
			await run.end({ outputs: params.outputs })
		}
	} catch (e) {
		console.error(`LangSmith: Failed to end run ${run.id}:`, e)
		// Decide if we should throw or just log. For telemetry, usually best not to break main flow.
	} finally {
		try {
			await run.postRun() // Ensure data is sent to LangSmith
		} catch (e) {
			console.error(`LangSmith: Failed to post run ${run.id}:`, e)
		}
	}
}

/**
 * Retrieves the ID of a run.
 * @param run - The RunTree instance.
 * @returns The ID of the run.
 */
export function getRunId(run: RunTree): string {
	return run.id
}
