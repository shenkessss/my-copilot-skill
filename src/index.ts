import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerWeather } from "./weather.js";
import { registerXcodeErrorAnalyzer } from "./xcode_error_analyzer.js";
import { registerGitCommitGenerator } from "./git_commit_generator.js";
import { registerSwiftUIComponentQuery } from "./swiftui_component_query.js";
import { registerCodeTemplateGenerator } from "./code_template_generator.js";

const server = new McpServer({ name: "my-copilot-skill", version: "1.0.0" });

// 注册所有 Skill
registerWeather(server);
registerXcodeErrorAnalyzer(server);
registerGitCommitGenerator(server);
registerSwiftUIComponentQuery(server);
registerCodeTemplateGenerator(server);

const transport = new StdioServerTransport();

(async () => {
  await server.connect(transport);
})();
