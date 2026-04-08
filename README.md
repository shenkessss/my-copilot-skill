# my-copilot-skill

一个基于 MCP (Model Context Protocol) 的 VS Code Copilot 天气技能，每次回答问题前自动告知今天星期几及当前天气。

## 功能

- 自动获取指定城市的实时天气
- 告知今天是星期几
- 每次对话前自动触发，再回答用户问题

## 项目结构

```
my-copilot-skill/
├── .github/
│   └── copilot-instructions.md   ← 全局指令，让 Copilot 自动调用天气工具
├── .vscode/
│   └── mcp.json                  ← 注册 MCP Server
├── src/
│   └── index.ts                  ← 核心代码（唯一需要写的）
├── dist/
│   └── index.js                  ← 编译产物（自动生成）
├── package.json
└── tsconfig.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译

```bash
npx tsc
```

### 3. 在 VS Code 中使用

1. 打开 Copilot Chat
2. 切换到 **Agent 模式**
3. 输入任意问题，Copilot 会自动先告知杭州天气再回答

## 技术栈

- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Model Context Protocol
- [wttr.in](https://wttr.in) - 天气数据接口
- TypeScript
- Node.js
