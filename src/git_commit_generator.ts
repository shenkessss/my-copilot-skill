import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGitCommitGenerator(server: McpServer) {
  server.tool(
    "git_commit_generator",
    "根据改动描述生成规范的 Git commit 信息",
    {
      type: z.enum(["feat", "fix", "refactor", "style", "docs", "test", "chore"]).describe("提交类型"),
      scope: z.string().optional().describe("影响范围，如 login、home、network"),
      description: z.string().describe("改动内容描述，中文即可"),
    },
    async ({ type, scope, description }) => {
      const typeDesc: Record<string, string> = {
        feat:     "新功能",
        fix:      "Bug 修复",
        refactor: "代码重构",
        style:    "样式/格式调整",
        docs:     "文档更新",
        test:     "测试相关",
        chore:    "构建/工具/依赖更新",
      };

      const scopePart = scope ? `(${scope})` : "";
      const commitMsg = `${type}${scopePart}: ${description}`;

      const examples = {
        feat:     `feat(login): 新增微信登录方式`,
        fix:      `fix(home): 修复首页列表滚动时崩溃的问题`,
        refactor: `refactor(network): 重构请求层，统一错误处理`,
        style:    `style(profile): 调整头像组件间距`,
        docs:     `docs: 更新 README 接入说明`,
        test:     `test(cart): 补充购物车单元测试`,
        chore:    `chore: 升级 Alamofire 到 5.9.0`,
      };

      return {
        content: [{
          type: "text",
          text: [
            `## 生成的 Commit 信息`,
            ````,
            commitMsg,
            ````,
            ``,
            `## 类型说明`,
            `**${type}** — ${typeDesc[type]}`,
            ``,
            `## 同类型示例`,
            ````,
            examples[type],
            ````,
            ``,
            `## 使用方式`,
            ```bash`,
            `git commit -m "${commitMsg}"`,
            ````,
          ].join("\n"),
        }],
      };
    }
  );
}