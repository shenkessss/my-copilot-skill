import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerXcodeErrorAnalyzer(server: McpServer) {
  server.tool(
    "xcode_error_analyzer",
    "解析 Xcode 报错信息，返回原因、修复方案和常见场景",
    { error: z.string() },
    async ({ error }) => {
      const knowledgeBase: Record<string, { reason: string; fix: string; scene: string }> = {
        "cannot convert value of type": {
          reason: "类型不匹配，赋值或传参时类型不一致",
          fix: `// 错误示例\nlet num: Int = "123"\n\n// 修复\nlet num: Int = Int("123") ?? 0`,
          scene: "函数传参、变量赋值、泛型使用时"
        },
        "use of unresolved identifier": {
          reason: "使用了未声明或不在当前作用域的变量/函数",
          fix: `// 检查是否拼写错误，或是否需要 import\nimport UIKit\n\n// 确认变量已声明\nlet myVar = "hello"`,
          scene: "变量名拼错、忘记 import、跨模块访问时"
        },
        "value of optional type must be unwrapped": {
          reason: "Optional 类型未解包就直接使用",
          fix: `// 方式1：可选绑定\nif let value = optionalValue {\n    print(value)\n}\n\n// 方式2：空合运算符\nlet value = optionalValue ?? "默认值"`,
          scene: "访问可能为 nil 的变量时"
        },
        "expression is ambiguous without more context": {
          reason: "编译器无法推断出明确的类型",
          fix: `// 错误示例\nlet arr = []\n\n// 修复：明确类型\nlet arr: [String] = []`,
          scene: "空数组/字典初始化、闭包返回值不明确时"
        },
        "missing return": {
          reason: "有返回值的函数缺少 return 语句",
          fix: `// 错误示例\nfunc getName() -> String {\n    let name = "Tom"\n}\n\n// 修复\nfunc getName() -> String {\n    let name = "Tom"\n    return name\n}`,
          scene: "函数有分支结构，某个分支忘记写 return 时"
        },
        "property initializer runs before": {
          reason: "在属性初始化时引用了 self，而 self 还未完成初始化",
          fix: `// 错误示例\nclass Foo {\n    let a = 1\n    let b = a + 1\n}\n\n// 修复\nclass Foo {\n    let a = 1\n    lazy var b: Int = { self.a + 1 }()\n}`,
          scene: "类的属性之间互相依赖初始化时"
        }
      };

      const errorLower = error.toLowerCase();
      const matched = Object.entries(knowledgeBase).find(([key]) =>
        errorLower.includes(key)
      );

      if (matched) {
        const [, info] = matched;
        return {
          content: [{
            type: "text",
            text: `## 错误原因\n${info.reason}\n\n## 修复方案\n\`\`\`swift\n${info.fix}\n\`\`\`\n\n## 常见场景\n${info.scene}`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `## 未找到匹配的错误\n请检查以下几点：\n1. 确认报错信息完整\n2. 查看 Xcode 报错行附近的代码\n3. 尝试 Clean Build（Cmd + Shift + K）再重新编译`
        }]
      };
    }
  );
}