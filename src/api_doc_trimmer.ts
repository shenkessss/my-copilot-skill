import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Recursively extracts the specified dot-notated fields from an object.
 * e.g. fields = ["user.name", "price"] extracts obj.user.name and obj.price
 */
function extractFields(obj: unknown, fields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of fields) {
    const parts = field.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current !== null && typeof current === "object" && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    result[field] = current;
  }

  return result;
}

/**
 * Infer the JSON type name of a value for display purposes.
 */
function inferType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * Build a schema-like description from an example object.
 */
function buildSchema(obj: Record<string, unknown>): Record<string, string> {
  const schema: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    schema[key] = inferType(value);
  }
  return schema;
}

export function registerApiDocTrimmer(server: McpServer) {
  server.tool(
    "api_doc_trimmer",
    "请求指定 URL，根据字段列表裁剪 JSON 响应，只保留需要的字段（支持嵌套字段如 user.name）",
    {
      url: z.string().describe("接口 URL"),
      fields: z
        .string()
        .describe("需要保留的字段，逗号分隔，支持嵌套如 user.name，例如 id,name,price,status"),
      headers: z
        .string()
        .optional()
        .describe("可选，请求头，JSON 字符串格式，如 {\"Authorization\":\"Bearer xxx\"}"),
    },
    async ({ url, fields, headers }) => {
      const fieldList = fields
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      // Parse headers
      let parsedHeaders: Record<string, string> = {};
      if (headers) {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch {
          return {
            content: [
              {
                type: "text",
                text: `❌ headers 参数格式错误，请传入合法的 JSON 字符串\n示例：{"Authorization":"Bearer xxx"}`,
              },
            ],
          };
        }
      }

      // Fetch the URL
      let responseData: unknown;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: parsedHeaders,
        });
        if (!response.ok) {
          return {
            content: [
              {
                type: "text",
                text: `❌ 请求失败：HTTP ${response.status} ${response.statusText}\n地址：${url}`,
              },
            ],
          };
        }
        responseData = await response.json();
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 请求或解析失败：${err}\n地址：${url}`,
            },
          ],
        };
      }

      // Handle array or object response
      const items: unknown[] = Array.isArray(responseData)
        ? responseData
        : [responseData];

      const trimmedItems = items.map((item) => extractFields(item, fieldList));

      // Count original fields from first item
      const firstRaw = items[0];
      const originalFieldCount =
        firstRaw !== null && typeof firstRaw === "object" && !Array.isArray(firstRaw)
          ? Object.keys(firstRaw as Record<string, unknown>).length
          : 0;

      const reductionPercent =
        originalFieldCount > 0
          ? Math.round(((originalFieldCount - fieldList.length) / originalFieldCount) * 100)
          : 0;

      // Build schema from first trimmed item
      const schema = buildSchema(trimmedItems[0] ?? {});

      // Show up to 3 example items
      const exampleItems = trimmedItems.slice(0, 3);

      const lines = [
        "## API 裁剪结果",
        "",
        `请求地址：${url}`,
        `保留字段：${fieldList.join(", ")}`,
        "",
        "### 裁剪后的数据结构",
        "```json",
        JSON.stringify(schema, null, 2),
        "```",
        "",
        "### 实际返回示例（前3条）",
        "```json",
        JSON.stringify(exampleItems, null, 2),
        "```",
        "",
        `原始字段数：${originalFieldCount} 个 → 保留：${fieldList.length} 个，减少 ${reductionPercent}%`,
      ];

      return {
        content: [
          {
            type: "text",
            text: lines.join("\n"),
          },
        ],
      };
    }
  );
}
