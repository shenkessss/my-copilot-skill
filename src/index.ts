import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerWeather } from "./weather.js";
import { registerXcodeErrorAnalyzer } from "./xcode_error_analyzer.js";

const server = new McpServer({ name: "my-copilot-skill", version: "1.0.0" });

// 注册所有 Skill
registerWeather(server);
registerXcodeErrorAnalyzer(server);

const transport = new StdioServerTransport();

(async () => {
  await server.connect(transport);
})();