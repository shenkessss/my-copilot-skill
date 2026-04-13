import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_KB_PATH = "./knowledge_base";

/**
 * Split a markdown file into sections by ## headings.
 * Returns an array of { heading, content } objects.
 */
function splitIntoSections(markdown: string): Array<{ heading: string; content: string }> {
  const sections: Array<{ heading: string; content: string }> = [];
  const lines = markdown.split("\n");
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading || currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
      }
      currentHeading = line.replace(/^##\s+/, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeading || currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });
  }

  return sections;
}

export function registerLocalKbQuery(server: McpServer) {
  server.tool(
    "local_kb_query",
    "查询本地 .md 知识库文件，按关键词返回相关段落（最多5条），附带来源文件名",
    {
      query: z.string().describe("查询关键词，如 HXButton、网络请求、颜色规范"),
      kbPath: z
        .string()
        .optional()
        .describe("知识库目录路径，默认 ./knowledge_base"),
    },
    async ({ query, kbPath }) => {
      const resolvedPath = path.resolve(kbPath || DEFAULT_KB_PATH);

      // Check if directory exists
      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 知识库目录不存在：${resolvedPath}\n请先创建 knowledge_base/ 目录并添加 .md 文件`,
            },
          ],
        };
      }

      // Read all .md files
      let mdFiles: string[];
      try {
        mdFiles = fs
          .readdirSync(resolvedPath)
          .filter((f) => f.endsWith(".md"));
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 读取知识库目录失败：${err}`,
            },
          ],
        };
      }

      if (mdFiles.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 知识库目录为空：${resolvedPath}\n请添加 .md 文件到该目录`,
            },
          ],
        };
      }

      // Collect matching sections
      const matches: Array<{ file: string; heading: string; content: string }> = [];
      const queryLower = query.toLowerCase();

      for (const file of mdFiles) {
        const filePath = path.join(resolvedPath, file);
        let markdown: string;
        try {
          markdown = fs.readFileSync(filePath, "utf-8");
        } catch {
          continue;
        }

        const sections = splitIntoSections(markdown);
        for (const section of sections) {
          const headingLower = section.heading.toLowerCase();
          const contentLower = section.content.toLowerCase();
          if (headingLower.includes(queryLower) || contentLower.includes(queryLower)) {
            matches.push({ file, heading: section.heading, content: section.content });
          }
        }
      }

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `## 知识库查询结果：${query}\n\n未找到与 "${query}" 相关的内容。\n\n已搜索文件：${mdFiles.join(", ")}`,
            },
          ],
        };
      }

      // Limit to top 5
      const topMatches = matches.slice(0, 5);

      const resultLines = [`## 知识库查询结果：${query}`, ""];
      for (const match of topMatches) {
        resultLines.push(`### 来源：${match.file}`);
        if (match.heading) {
          resultLines.push(`**${match.heading}**`);
        }
        resultLines.push(match.content);
        resultLines.push("");
      }
      resultLines.push(`共找到 ${matches.length} 条相关内容`);

      return {
        content: [
          {
            type: "text",
            text: resultLines.join("\n"),
          },
        ],
      };
    }
  );
}
