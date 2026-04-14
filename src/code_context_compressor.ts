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

      // 提取关键行，跳过函数体和计算属性体
      const result: string[] = [];
      // 记录当前处于跳过代码块内的未闭合花括号层数
      let skipDepth = 0;

      for (const line of lines) {
        const trimmed = line.trim();

        // 统计本行的花括号数量
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;

        // 处于跳过的代码块内，只跟踪深度
        if (skipDepth > 0) {
          skipDepth += opens - closes;
          // 代码块已闭合，输出当前闭合括号行
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
          // 保留声明行；若开启了代码块，保留 `{` 但跳过代码块内容
          const hasBrace = opens > closes;
          // 去掉 `{` 后的内联内容，只保留签名和 `{`
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
          // 只保留函数签名（去掉内联函数体）
          const sig = line.replace(/\s*\{.*$/, "").trimEnd();
          result.push(sig);
          if (opens > closes) {
            skipDepth = opens - closes;
          }
          continue;
        }

        if (isPropertyWrapper || isVarLet) {
          // 保留声明行；如有计算属性体则跳过
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
