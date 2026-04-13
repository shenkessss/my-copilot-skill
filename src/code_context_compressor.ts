import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerCodeContextCompressor(server: McpServer) {
  server.tool(
    "code_context_compressor",
    "输入一段 Swift 代码，输出关键结构摘要（类名、属性声明、方法签名、MARK 注释），节省 token",
    {
      code: z.string().describe("要压缩的 Swift 代码内容"),
    },
    async ({ code }) => {
      const lines = code.split("\n");
      const originalLineCount = lines.length;
      const result: string[] = [];

      // Patterns to keep
      const typeDeclarationPattern = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?(final\s+)?(class|struct|protocol|enum|actor)\s+\w+(<[^>]*>)?/;
      const extensionPattern = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?extension\s+\w+(<[^>]*>)?/;
      const markPattern = /^\s*\/\/\s*MARK:/;
      const propertyPattern = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?(static\s+|class\s+|lazy\s+|weak\s+|unowned\s+)?(@\w+[^\n]*)?\s*(var|let)\s+\w+/;
      const funcPattern = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?(static\s+|class\s+|override\s+|mutating\s+|required\s+|convenience\s+)?(@\w+[^\n]*)?\s*func\s+\w+/;
      const initPattern = /^\s*(public\s+|private\s+|internal\s+|open\s+|fileprivate\s+)?(required\s+|convenience\s+)?init\s*[(<]/;
      const closingBracePattern = /^\s*\}$/;

      // Track brace depth to know when we're inside a method body
      let braceDepth = 0;
      let insideMethodBody = false;
      let methodBraceDepth = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Count braces
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;

        if (insideMethodBody) {
          braceDepth += openBraces - closeBraces;
          if (braceDepth <= methodBraceDepth) {
            insideMethodBody = false;
          }
          continue;
        }

        if (markPattern.test(line)) {
          result.push(trimmed);
        } else if (typeDeclarationPattern.test(line) || extensionPattern.test(line)) {
          result.push(trimmed);
          braceDepth += openBraces - closeBraces;
        } else if (propertyPattern.test(line)) {
          // Only keep the declaration line (no getter/setter body)
          const hasOpenBrace = line.includes("{");
          if (hasOpenBrace) {
            // Check if the entire property declaration is on a single line
            // by counting that opening and closing braces balance on this line
            const openCount = (line.match(/\{/g) || []).length;
            const closeCount = (line.match(/\}/g) || []).length;
            const isSingleLineProp = openCount === closeCount && openCount > 0;
            if (isSingleLineProp) {
              // One-line computed property, keep only the declaration part
              const simplified = trimmed.split("{")[0].trim();
              result.push(simplified);
            } else {
              // Multi-line getter/setter — keep only declaration
              const declPart = trimmed.split("{")[0].trim();
              result.push(declPart);
              insideMethodBody = true;
              methodBraceDepth = braceDepth;
              braceDepth += openBraces - closeBraces;
            }
          } else {
            result.push(trimmed);
            braceDepth += openBraces - closeBraces;
          }
        } else if (funcPattern.test(line) || initPattern.test(line)) {
          // Keep only the signature line, skip the body
          if (line.includes("{")) {
            const sigPart = trimmed.split("{")[0].trim();
            result.push(sigPart);
            insideMethodBody = true;
            methodBraceDepth = braceDepth;
            braceDepth += openBraces - closeBraces;
          } else {
            result.push(trimmed);
            braceDepth += openBraces - closeBraces;
          }
        } else if (closingBracePattern.test(line)) {
          braceDepth += openBraces - closeBraces;
          result.push("}");
        } else {
          braceDepth += openBraces - closeBraces;
        }
      }

      const compressed = result.join("\n");
      const compressedLineCount = result.length;
      const savedPercent =
        originalLineCount > 0
          ? Math.round(((originalLineCount - compressedLineCount) / originalLineCount) * 100)
          : 0;

      return {
        content: [
          {
            type: "text",
            text: [
              "## 代码结构摘要",
              "",
              compressed,
              "",
              `原始 ${originalLineCount} 行 → 压缩为 ${compressedLineCount} 行，节省 ${savedPercent}%`,
            ].join("\n"),
          },
        ],
      };
    }
  );
}
