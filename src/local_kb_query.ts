import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_KB_PATH = "./knowledge_base";
const MAX_RESULTS = 5;

interface KbMatch {
  file: string;
  heading: string;
  content: string;
}

export function registerLocalKbQuery(server: McpServer) {
  server.tool(
    "local_kb_query",
    "查询本地知识库（.md 文件），返回相关片段，最多返回 5 条",
    {
      query: z.string().describe("查询关键词"),
      kbPath: z
        .string()
        .optional()
        .describe("知识库目录路径，默认 ./knowledge_base"),
    },
    async ({ query, kbPath }) => {
      const resolvedPath = path.resolve(kbPath || DEFAULT_KB_PATH);

      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 知识库目录不存在：${resolvedPath}\n请先创建该目录并添加 .md 文件。`,
            },
          ],
        };
      }

      let mdFiles: string[];
      try {
        mdFiles = fs
          .readdirSync(resolvedPath)
          .filter((f) => f.endsWith(".md"))
          .map((f) => path.join(resolvedPath, f));
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 读取知识库目录出错：${err}`,
            },
          ],
        };
      }

      if (mdFiles.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `知识库目录 ${resolvedPath} 中没有找到 .md 文件。`,
            },
          ],
        };
      }

      const queryLower = query.toLowerCase();
      const matches: KbMatch[] = [];

      for (const filePath of mdFiles) {
        const fileName = path.basename(filePath);
        let fileContent: string;
        try {
          fileContent = fs.readFileSync(filePath, "utf-8");
        } catch {
          continue;
        }

        // Split into sections at ## headings; prepend newline to ensure the first
        // heading at position 0 is also captured by the \n(?=## ) split pattern.
        const normalized = fileContent.startsWith("## ") ? "\n" + fileContent : fileContent;
        const sections = normalized.split(/\n(?=## )/);
        for (const section of sections) {
          const lines = section.split("\n");
          const headingLine = lines[0].trim();
          const heading = headingLine.replace(/^##\s*/, "");
          const body = lines.slice(1).join("\n").trim();

          // Case-insensitive match against heading + body
          const combinedText = (heading + "\n" + body).toLowerCase();
          if (combinedText.includes(queryLower)) {
            matches.push({ file: fileName, heading, content: body });
          }

          if (matches.length >= MAX_RESULTS) break;
        }

        if (matches.length >= MAX_RESULTS) break;
      }

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `## 知识库查询结果：「${query}」\n\n没有找到相关内容。`,
            },
          ],
        };
      }

      const resultParts = [
        `## 知识库查询结果：「${query}」`,
        ``,
        `找到 ${matches.length} 条相关内容：`,
      ];

      for (const match of matches) {
        resultParts.push(``, `### [${match.file}] ${match.heading}`, match.content);
      }

      return {
        content: [{ type: "text", text: resultParts.join("\n") }],
      };
    }
  );
}
