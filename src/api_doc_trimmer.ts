import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 解析对象中的嵌套字段路径，如 "data.id"
 */
function getNestedValue(obj: unknown, fieldPath: string): unknown {
  const parts = fieldPath.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * 向目标对象中写入嵌套字段路径（如 "data.id"）
 * 预先校验所有路径段以防止原型链污染，
 * 且仅向新创建的子对象赋值
 */
function setNestedValue(
  target: Record<string, unknown>,
  fieldPath: string,
  value: unknown
): void {
  const parts = fieldPath.split(".");
  // 拒绝包含原型链污染键名的路径
  if (parts.some((p) => DANGEROUS_KEYS.has(p))) return;

  let current: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const existing = Object.prototype.hasOwnProperty.call(current, part)
      ? current[part]
      : undefined;
    if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
      // 进入已有的普通对象子节点
      current = existing as Record<string, unknown>;
    } else {
      // 创建新的子对象并赋值（不操作用户控制的已有值）
      const child: Record<string, unknown> = {};
      current[part] = child;
      current = child;
    }
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * 递归统计对象中所有叶子字段的总数
 */
function countFields(obj: unknown): number {
  if (obj === null || obj === undefined) return 0;
  if (typeof obj !== "object") return 1;
  if (Array.isArray(obj)) {
    return obj.reduce((sum: number, item) => sum + countFields(item), 0);
  }
  return Object.values(obj as Record<string, unknown>).reduce(
    (sum: number, v) => sum + countFields(v),
    0
  );
}

export function registerApiDocTrimmer(server: McpServer) {
  server.tool(
    "api_doc_trimmer",
    "自动请求接口 URL，只保留指定字段，去掉无关内容",
    {
      url: z.string().url().describe("接口 URL"),
      fields: z
        .array(z.string())
        .describe("需要保留的字段名列表，支持嵌套，如 \"data.id\"、\"data.title\""),
    },
    async ({ url, fields }) => {
      let rawData: unknown;

      try {
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          return {
            content: [
              {
                type: "text",
                text: `❌ 请求失败：HTTP ${response.status} ${response.statusText}\n接口：${url}`,
              },
            ],
          };
        }
        rawData = await response.json();
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 请求出错：${err}\n接口：${url}`,
            },
          ],
        };
      }

      const originalFieldCount = countFields(rawData);

      // 构建裁剪后的对象
      const trimmed: Record<string, unknown> = {};
      for (const field of fields) {
        const value = getNestedValue(rawData, field);
        if (value !== undefined) {
          setNestedValue(trimmed, field, value);
        }
      }

      const keptFieldCount = countFields(trimmed);

      const text = [
        `## API 裁剪结果`,
        ``,
        `接口：${url}`,
        `保留字段：${fields.join(", ")}`,
        ``,
        JSON.stringify(trimmed, null, 2),
        ``,
        `原始字段数：${originalFieldCount} → 保留字段数：${keptFieldCount}`,
      ].join("\n");

      return {
        content: [{ type: "text", text }],
      };
    }
  );
}
