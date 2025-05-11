import { Task } from "../task/Task"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"
import { ClineAskUseMcpServer } from "../../shared/ExtensionMessage"
import { startChildRun, endRun, RunTree } from "../../telemetry/langsmith"

export async function useMcpToolTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const server_name: string | undefined = block.params.server_name
	const tool_name: string | undefined = block.params.tool_name
	const mcp_arguments: string | undefined = block.params.arguments
	let toolRun: RunTree | undefined
	try {
		if (block.partial) {
			const partialMessage = JSON.stringify({
				type: "use_mcp_tool",
				serverName: removeClosingTag("server_name", server_name),
				toolName: removeClosingTag("tool_name", tool_name),
				arguments: removeClosingTag("arguments", mcp_arguments),
			} satisfies ClineAskUseMcpServer)

			await cline.ask("use_mcp_server", partialMessage, block.partial).catch(() => {})
			return
		} else {
			if (!server_name) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("use_mcp_tool")
				pushToolResult(await cline.sayAndCreateMissingParamError("use_mcp_tool", "server_name"))
				return
			}

			if (!tool_name) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("use_mcp_tool")
				pushToolResult(await cline.sayAndCreateMissingParamError("use_mcp_tool", "tool_name"))
				return
			}

			let parsedArguments: Record<string, unknown> | undefined

			if (mcp_arguments) {
				try {
					parsedArguments = JSON.parse(mcp_arguments)
				} catch (error) {
					cline.consecutiveMistakeCount++
					cline.recordToolError("use_mcp_tool")
					await cline.say("error", `Roo tried to use ${tool_name} with an invalid JSON argument. Retrying...`)

					pushToolResult(
						formatResponse.toolError(formatResponse.invalidMcpToolArgumentError(server_name, tool_name)),
					)

					return
				}
			}

			cline.consecutiveMistakeCount = 0

			const completeMessage = JSON.stringify({
				type: "use_mcp_tool",
				serverName: server_name,
				toolName: tool_name,
				arguments: mcp_arguments,
			} satisfies ClineAskUseMcpServer)

			const didApprove = await askApproval("use_mcp_server", completeMessage)

			if (!didApprove) {
				return
			}

			// LangSmith: Start child run for the tool
			if (cline.langsmithRun && tool_name) {
				// tool_name is validated by this point
				try {
					toolRun = await startChildRun(cline.langsmithRun, tool_name, "tool", {
						inputs: {
							server_name,
							tool_name,
							arguments: parsedArguments !== undefined ? parsedArguments : mcp_arguments,
						},
					})
				} catch (telemetryError) {
					console.error(`LangSmith: Failed to start child run for tool ${tool_name}:`, telemetryError)
					// toolRun remains undefined, tool execution continues
				}
			}

			// Now execute the tool
			await cline.say("mcp_server_request_started") // same as browser_action_result

			const toolResult = await cline.providerRef
				.deref()
				?.getMcpHub()
				?.callTool(server_name, tool_name, parsedArguments)

			// TODO: add progress indicator and ability to parse images and non-text responses
			const toolResultPretty =
				(toolResult?.isError ? "Error:\n" : "") +
					toolResult?.content
						.map((item) => {
							if (item.type === "text") {
								return item.text
							}
							if (item.type === "resource") {
								const { blob: _, ...rest } = item.resource
								return JSON.stringify(rest, null, 2)
							}
							return ""
						})
						.filter(Boolean)
						.join("\n\n") || "(No response)"

			await cline.say("mcp_server_response", toolResultPretty)

			// LangSmith: End child run with success
			if (toolRun) {
				try {
					await endRun(toolRun, {
						outputs: {
							result: toolResultPretty,
							rawResult: toolResult?.content, // Include structured content if available
						},
					})
				} catch (telemetryError) {
					console.error(`LangSmith: Failed to end child run for tool ${tool_name}:`, telemetryError)
				}
			}

			pushToolResult(formatResponse.toolResult(toolResultPretty))

			return
		}
	} catch (error) {
		// LangSmith: End child run with error
		if (toolRun && tool_name) {
			try {
				await endRun(toolRun, { error })
			} catch (telemetryError) {
				console.error(`LangSmith: Failed to end child run with error for tool ${tool_name}:`, telemetryError)
			}
		}
		await handleError("executing MCP tool", error)
		return
	}
}
