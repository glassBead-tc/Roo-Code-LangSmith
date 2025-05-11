import { Client } from "langsmith"
import { configureLangSmith, getClient } from "../langsmith"

// Mock the langsmith Client
jest.mock("langsmith", () => {
	return {
		Client: jest.fn().mockImplementation(() => ({
			// Mock methods as needed
			createRun: jest.fn().mockResolvedValue({ id: "test-run-id" }),
		})),
	}
})

describe("LangSmith client", () => {
	beforeEach(() => {
		// Reset mocks between tests
		jest.clearAllMocks()
		// Reset client instance and configuration
		configureLangSmith({})
	})

	it("should create a client with default settings when no config is provided", () => {
		// Get client without configuration
		getClient()

		// Verify Client constructor was called
		expect(Client).toHaveBeenCalledTimes(1)
		expect(Client).toHaveBeenCalledWith()
	})

	it("should create a client with provided API key", () => {
		// Configure with API key
		configureLangSmith({ apiKey: "test-api-key" })

		// Get client
		getClient()

		// Verify Client constructor was called with API key
		expect(Client).toHaveBeenCalledTimes(1)
		expect(Client).toHaveBeenCalledWith({
			apiKey: "test-api-key",
		})
	})

	it("should create a new client when configuration changes", () => {
		// Get client with default config
		const client1 = getClient()

		// Configure with API key
		configureLangSmith({ apiKey: "test-api-key" })

		// Get client again
		const client2 = getClient()

		// Verify Client constructor was called for each getClient invocation
		expect(Client).toHaveBeenCalledTimes(2)

		// Ensure the new client instance is different from the previous one
		expect(client2).not.toBe(client1)
	})
})
