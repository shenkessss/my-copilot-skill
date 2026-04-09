import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSwiftUIComponentQuery(server: McpServer) {
  server.tool(
    "swiftui_component_query",
    "查询 SwiftUI 组件用法，返回���明、常用参数和示例代码",
    {
      component: z.string().describe("组件名称，如 List、NavigationStack、LazyVGrid"),
    },
    async ({ component }) => {
      const db: Record<string, { desc: string; params: string[]; example: string }> = {
        "list": {
          desc: "列表组件，用于展示滚动的行数据",
          params: [
            "selection: 绑定选中项",
            "rowContent: 每行的视图构建闭包",
          ],
          example: `List(items, id: \.id) { item in\n    Text(item.name)\n}`,
        },
        "navigationstack": {
          desc: "导航容器，替代 NavigationView（iOS 16+）",
          params: [
            "path: 绑定导航路径（NavigationPath）",
            "root: 根视图闭包",
          ],
          example: `NavigationStack {\n    List(items, id: \.id) { item in\n        NavigationLink(item.name, value: item)\n    }\n    .navigationTitle("列表")\n    .navigationDestination(for: Item.self) { item in\n        DetailView(item: item)\n    }\n}`,
        },
        "lazyvgrid": {
          desc: "懒加载垂直网格布局",
          params: [
            "columns: [GridItem] ��义列数和宽度",
            "alignment: 水平对齐方式",
            "spacing: 行间距",
          ],
          example: `let columns = [GridItem(.flexible()), GridItem(.flexible())]\n\nScrollView {\n    LazyVGrid(columns: columns, spacing: 16) {\n        ForEach(items, id: \.id) { item in\n            ItemCard(item: item)\n        }\n    }\n    .padding()\n}`,
        },
        "sheet": {
          desc: "底部弹出浮层",
          params: [
            "isPresented: Binding<Bool> 控制显示",
            "onDismiss: 关闭时回调",
            "content: 弹层内容视图",
          ],
          example: `.sheet(isPresented: $showSheet) {\n    DetailView()\n        .presentationDetents([.medium, .large])\n}`,
        },
        "asyncimage": {
          desc: "异步加载网络图片（iOS 15+）",
          params: [
            "url: URL? 图片地址",
            "content: 加载成功后的视图",
            "placeholder: 加载中的占位视图",
          ],
          example: `AsyncImage(url: URL(string: imageUrl)) { image in\n    image\n        .resizable()\n        .scaledToFill()\n} placeholder: {\n    ProgressView()\n}`,
        },
        "scrollview": {
          desc: "可滚动容器",
          params: [
            "axes: 滚动方向 .vertical / .horizontal",
            "showsIndicators: 是否显示滚动条",
          ],
          example: `ScrollView(.vertical, showsIndicators: false) {\n    VStack(spacing: 12) {\n        ForEach(items, id: \.id) { item in\n            ItemRow(item: item)\n        }\n    }\n    .padding()\n}`,
        },
        "tabview": {
          desc: "底部 Tab 导航栏",
          params: [
            "selection: 绑定当前选中 Tab",
          ],
          example: `TabView(selection: $selectedTab) {\n    HomeView()\n        .tabItem {\n            Label("首页", systemImage: "house")\n        }\n        .tag(0)\n    ProfileView()\n        .tabItem {\n            Label("我的", systemImage: "person")\n        }\n        .tag(1)\n}`,
        },
      };

      const key = component.toLowerCase().replace(/\s/g,"");
      const info = db[key];

      if (info) {
        return {
          content: [{
            type: "text",
            text: [
              `## ${component}`,
              ``,
              `### 说明`,
              info.desc,
              ``,
              `### 常用参数`,
              info.params.map(p => `- ${p}`).join("\n"),
              ``,
              `### 示例代码`,
              "```swift",
              info.example,
              "```",
            ].join("\n"),
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: `## 未找到 "${component}" 的内置说明\n\n支持查询的组件：\n${Object.keys(db).map(k => `- ${k}`).join("\n")}\n\n建议查阅官方文档：https://developer.apple.com/documentation/swiftui`,
        }],
      };
    }
  );
}