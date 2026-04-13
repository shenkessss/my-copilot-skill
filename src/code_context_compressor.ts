import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerCodeContextCompressor(server: McpServer) {
  server.tool(
    "code_context_compressor",
    "把输入的 Swift 代码压缩成关键结构摘要，减少发给 Copilot 的 token 数",
    {
      code: z.string().describe("要压缩的 Swift 代码"),
    },
    async ({ code }) => {
      const lines = code.split("\n");
      const originalCount = lines.length;

      // Extract key lines, skipping function/computed property bodies
      const result: string[] = [];
      // Track how many unclosed braces we are inside a skipped body
      let skipDepth = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // Count braces on this line
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;

        // If we are inside a skipped body, just track depth
        if (skipDepth > 0) {
          skipDepth += opens - closes;
          // Body just closed — emit the closing brace line as-is
          if (skipDepth <= 0) {
            skipDepth = 0;
            result.push(line);
          }
          continue;
        }

        const isMark = /^\s*\/\/ MARK:/.test(line);
        const isTypeDecl = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?(final\s+)?(class|struct|protocol|enum|extension)\s/.test(line);
        const isPropertyWrapper = /^\s*@(Published|State|StateObject|ObservedObject|Binding)\s/.test(line);
        const isFunc = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?(override\s+)?func\s/.test(line);
        const isVarLet = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?(static\s+|lazy\s+)?(var|let)\s/.test(line) && !isPropertyWrapper;
        const isClosingBrace = trimmed === "}";

        if (isMark) {
          result.push(line);
          continue;
        }

        if (isTypeDecl) {
          // Keep the declaration line; if it opens a body, keep the `{` but skip the body content
          const hasBrace = opens > closes;
          // Strip any inline body content after `{`, keep only the signature + `{`
          const sig = hasBrace
            ? line.replace(/\{.*$/, "{").trimEnd()
            : line;
          result.push(sig);
          if (hasBrace) {
            skipDepth = opens - closes;
          }
          continue;
        }

        if (isFunc) {
          // Keep signature only (remove body if inline)
          const sig = line.replace(/\s*\{.*$/, "").trimEnd();
          result.push(sig);
          if (opens > closes) {
            skipDepth = opens - closes;
          }
          continue;
        }

        if (isPropertyWrapper || isVarLet) {
          // Keep declaration line; skip computed property body if present
          const sig = line.replace(/\s*\{.*$/, "").trimEnd();
          result.push(sig);
          if (opens > closes) {
            skipDepth = opens - closes;
          }
          continue;
        }

        if (isClosingBrace) {
          result.push(line);
          continue;
        }
      }

      const compressedCount = result.length;
      const savedPercent =
        originalCount > 0
          ? Math.round(((originalCount - compressedCount) / originalCount) * 100)
          : 0;

      const summary = [
        `## 代码结构摘要`,
        ``,
        `原始行数：${originalCount} 行 → 压缩后：${compressedCount} 行（节省 ${savedPercent}%）`,
        ``,
        ...result,
      ].join("\n");

      return {
        content: [{ type: "text", text: summary }],
      };
    }
  );
}
