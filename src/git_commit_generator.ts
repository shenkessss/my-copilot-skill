import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";

export function registerGitCommitGenerator(server: McpServer) {
  server.tool(
    "git_commit_generator",
    "自动读取 git diff 暂存区改动，分析文件变化，自动生成规范的 Git commit 信息",
    {
      projectPath: z.string().optional().describe("项目路径，默认使用当前目录"),
    },
    async ({ projectPath }) => {
      const cwd = projectPath || process.cwd();

      let diff = "";
      let stagedFiles: string[] = [];

      try {
        diff = execSync("git diff --staged", { cwd, encoding: "utf-8" });
        const filesOutput = execSync("git diff --staged --name-status", { cwd, encoding: "utf-8" });
        stagedFiles = filesOutput.trim().split("\n").filter(Boolean);
      } catch {
        return {
          content: [{
            type: "text",
            text: "❌ 无法读取 git 信息，请确认：\n1. 当前目录是 git 仓库\n2. 已执行 `git add` 将文件加入暂存区",
          }],
        };
      }

      if (!diff.trim()) {
        return {
          content: [{
            type: "text",
            text: "⚠️ 暂存区没有改动，请先执行 `git add <文件>` 将改动加入暂存区",
          }],
        };
      }

      const addedFiles    = stagedFiles.filter(l => l.startsWith("A")).map(l => l.split("\t")[1]);
      const modifiedFiles = stagedFiles.filter(l => l.startsWith("M")).map(l => l.split("\t")[1]);
      const deletedFiles  = stagedFiles.filter(l => l.startsWith("D")).map(l => l.split("\t")[1]);
      const allFiles      = [...addedFiles, ...modifiedFiles, ...deletedFiles];

      const inferType = (): string => {
        const allPaths = allFiles.join(" ").toLowerCase();
        if (allPaths.includes("test") || allPaths.includes("spec"))   return "test";
        if (allPaths.includes("readme") || allPaths.includes(".md"))  return "docs";
        if (allPaths.includes("package.json") || allPaths.includes("tsconfig") || allPaths.includes(".github")) return "chore";
        if (deletedFiles.length > 0 && addedFiles.length === 0)       return "refactor";
        if (addedFiles.length > 0 && modifiedFiles.length === 0)      return "feat";
        if (modifiedFiles.length > 0 && addedFiles.length === 0)      return "fix";
        return "feat";
      };

      const inferScope = (): string => {
        if (allFiles.length === 0) return "";
        const first = allFiles[0];
        const parts = first.replace(/\\/g, "/").split("/");
        if (parts.length >= 2) return parts[parts.length - 2];
        return parts[0].replace(/\.[^.]+$/, "");
      };

      const inferDescription = (type: string): string => {
        const fileNames = allFiles.map(f => f.split("/").pop()?.replace(/\.[^.]+$/, "") ?? f);
        const uniqueNames = [...new Set(fileNames)].slice(0, 3).join("、");
        const actionMap: Record<string, string> = {
          feat:     `新增 ${uniqueNames} 功能`,
          fix:      `修复 ${uniqueNames} 相关问题`,
          refactor: `重构 ${uniqueNames}`,
          style:    `调整 ${uniqueNames} 样式`,
          docs:     `更新 ${uniqueNames} 文档`,
          test:     `补充 ${uniqueNames} 测试`,
          chore:    `更新 ${uniqueNames} 配置`,
        };
        return actionMap[type] ?? `更新 ${uniqueNames}`;
      };

      const type        = inferType();
      const scope       = inferScope();
      const description = inferDescription(type);
      const scopePart   = scope ? `(${scope})` : "";
      const commitMsg   = `${type}${scopePart}: ${description}`;

      const bodyLines: string[] = [];
      if (addedFiles.length > 0)    bodyLines.push(`- 新增: ${addedFiles.join(", ")}`);
      if (modifiedFiles.length > 0) bodyLines.push(`- 修改: ${modifiedFiles.join(", ")}`);
      if (deletedFiles.length > 0)  bodyLines.push(`- 删除: ${deletedFiles.join(", ")}`);
      const body = bodyLines.join("\n");

      return {
        content: [{
          type: "text",
          text: [
            "## ✅ 自动生成的 Commit 信息",
            "",
            "### 标题",
            "```",
            commitMsg,
            "```",
            "",
            "### 详细改动",
            "```",
            body,
            "```",
            "",
            "### 一键提交命令",
            "```bash",
            `git commit -m "${commitMsg}"`,
            "```",
            "",
            `> 共 ${allFiles.length} 个文件改动：新增 ${addedFiles.length} 个，修改 ${modifiedFiles.length} 个，删除 ${deletedFiles.length} 个`,
          ].join("\n"),
        }],
      };
    }
  );
}