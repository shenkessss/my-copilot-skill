# my-copilot-skill

一个基于 MCP (Model Context Protocol) 的 VS Code Copilot 技能集，每次回答问题前自动告知今天星期几及当前天气，并根据场景自动调用对应工具。

## 🛠 已注册的 Skill

| 工具 | 触发关键词 | 说明 |
|---|---|---|
| `get_weather` | 每次回答前都调用 | 自动获取杭州天气和星期几 |
| `xcode_error_analyzer` | Xcode报错、Swift错误、编译错误 | 分析报错原因并给出修复方案 |
| `git_commit_generator` | 生成commit、提交说明 | 自动读取暂存区改动生成规范 commit 信息 |
| `swiftui_component_query` | SwiftUI组件用法、控件怎么用 | 返回组件说明、常用参数和示例代码 |
| `code_template_generator` | 生成模板、MVVM/MVC/Clean架构 | 根据页面名和架构模式生成代码模板 |
| `code_context_compressor` | 压缩代码、提取代码结构、把长文件变短 | 把 Swift 代码压缩成关键结构摘要，节省 token |
| `api_doc_trimmer` | 裁剪 API 响应、只保留部分字段 | 自动请求接口 URL，只保留指定字段 |
| `local_kb_query` | 查询组件用法、设计规范、公司内部规范 | 查询本地知识库 .md 文件，返回相关片段 |

## 📁 项目结构

```
my-copilot-skill/
├── .github/
│   └── copilot-instructions.md   ← 全局指令，定义每个工具的触发时机
├── .vscode/
│   └── mcp.json                  ← 注册 MCP Server
├── src/
│   ├── index.ts                  ← 入口，注册所有 Skill
│   ├── weather.ts                ← 天气工具
│   ├── xcode_error_analyzer.ts   ← Xcode 报错分析
│   ├── git_commit_generator.ts   ← Git 提交信息生成
│   ├── swiftui_component_query.ts← SwiftUI 组件查询
│   └── code_template_generator.ts← 代码模板生成
├── dist/                         ← 编译产物（自动生成���
├── package.json
└── tsconfig.json
```

## 📋 每个文件的作用

| 文件 | 必须? | 作用 |
|---|---|---|
| `src/index.ts` | ✅ 必须 | MCP Server 入口，注册所有工具 |
| `dist/index.js` | ✅ 必须 | 编译后的产物，实际运行的文件 |
| `.vscode/mcp.json` | ✅ 必须 | 告诉 VS Code 去哪里找 MCP Server |
| `package.json` | ✅ 必须 | 定义依赖（`@modelcontextprotocol/sdk` 等） |
| `tsconfig.json` | ✅ 必须 | TypeScript 编译配置 |
| `node_modules/` | ✅ 必须 | 依赖库（npm install 生成） |
| `.github/copilot-instructions.md` | ⭐ 建议 | 全局指令，定义工具触发时机 |
| `.gitignore` | 🔧 建议 | 排除 `node_modules` 和 `dist` |
| `package-lock.json` | 🔧 建议 | 锁定依赖版本 |

## 🚀 快速开始

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
3. 根据需要输入对应问题，Copilot 会自动调用对应工具

## 💡 使用示例

**天气查询（自动触发）：**
> 直接提问任何问题，自动先报天气

**Xcode 报错分析：**
> 帮我看看这个报错：value of optional type must be unwrapped

**Git commit 生成：**
> 先 `git add .`，再说：帮我生成这次的 commit 信息

**SwiftUI 组件查询：**
> 查询 SwiftUI 的 NavigationStack 用法

**代码模板生成：**
> 帮我生成一个 OrderDetail 页面的 Clean 架构模板

## 🔧 copilot-instructions.md 配置说明

工具能否自动触发，取决于 `.github/copilot-instructions.md` 里的描述。
每新增一个工具，都需要在该文件里说明**触发条件**，否则 Copilot 不会主动调用。

## 技术栈

- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Model Context Protocol
- [wttr.in](https://wttr.in) - 天气数据接口
- TypeScript
- Node.js
