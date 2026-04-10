import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_PROJECT_PATH = "/Users/ivymacpro/Desktop/cursorSwiftUI/shopping_swiftui_cursor";

export function registerCodeTemplateGenerator(server: McpServer) {
  server.tool(
    "code_template_generator",
    "根据页面名称和架构模式生成 iOS Swift 代码模板，并直接写入 Xcode 项目目录",
    {
      name: z.string().describe("页面或模块名称，如 UserList、Login、OrderDetail"),
      pattern: z.enum(["mvvm", "mvc", "clean"]).describe("架构模式"),
      projectPath: z.string().optional().describe("Xcode 项目路径，默认 /Users/ivymacpro/Desktop/cursorSwiftUI/shopping_swiftui_cursor"),
    },
    async ({ name, pattern, projectPath }) => {
      const basePath = projectPath || DEFAULT_PROJECT_PATH;

      // MVVM: 分3个文件
      const fileMap: Record<string, Record<string, string>> = {
        mvvm: {
          [`${name}Model.swift`]: [
            `import Foundation`,
            ``,
            `// MARK: - Model`,
            `struct ${name}Model: Identifiable, Codable {`,
            `    let id: String`,
            `    let title: String`,
            `}`,
          ].join("\n"),

          [`${name}ViewModel.swift`]: [
            `import Foundation`,
            ``,
            `// MARK: - ViewModel`,
            `@MainActor`,
            `class ${name}ViewModel: ObservableObject {`,
            `    @Published var items: [${name}Model] = []`,
            `    @Published var isLoading = false`,
            `    @Published var errorMessage: String?`,
            ``,
            `    func fetchData() async {`,
            `        isLoading = true`,
            `        defer { isLoading = false }`,
            `        do {`,
            `            // TODO: 调用 API`,
            `            // items = try await APIService.fetch${name}()`,
            `        } catch {`,
            `            errorMessage = error.localizedDescription`,
            `        }`,
            `    }`,
            `}`,
          ].join("\n"),

          [`${name}View.swift`]: [
            `import SwiftUI`,
            ``,
            `// MARK: - View`,
            `struct ${name}View: View {`,
            `    @StateObject private var viewModel = ${name}ViewModel()`,
            ``,
            `    var body: some View {`,
            `        Group {`,
            `            if viewModel.isLoading {`,
            `                ProgressView()`,
            `            } else {`,
            `                List(viewModel.items) { item in`,
            `                    Text(item.title)`,
            `                }`,
            `            }`,
            `        }`,
            `        .navigationTitle("${name}")`,
            `        .task {`,
            `            await viewModel.fetchData()`,
            `        }`,
            `        .alert("错误", isPresented: .constant(viewModel.errorMessage != nil)) {`,
            `            Button("确认") { viewModel.errorMessage = nil }`,
            `        } message: {`,
            `            Text(viewModel.errorMessage ?? "")`,
            `        }`,
            `    }`,
            `}`,
            ``,
            `#Preview {`,
            `    ${name}View()`,
            `}`,
          ].join("\n"),
        },

        mvc: {
          [`${name}Model.swift`]: [
            `import Foundation`,
            ``,
            `// MARK: - Model`,
            `struct ${name}Model {`,
            `    let id: String`,
            `    let title: String`,
            `}`,
          ].join("\n"),

          [`${name}ViewController.swift`]: [
            `import UIKit`,
            ``,
            `// MARK: - ViewController`,
            `class ${name}ViewController: UIViewController {`,
            ``,
            `    private var items: [${name}Model] = []`,
            ``,
            `    private lazy var tableView: UITableView = {`,
            `        let tv = UITableView()`,
            `        tv.dataSource = self`,
            `        tv.delegate = self`,
            `        tv.register(UITableViewCell.self, forCellReuseIdentifier: "cell")`,
            `        return tv`,
            `    }()`,
            ``,
            `    override func viewDidLoad() {`,
            `        super.viewDidLoad()`,
            `        title = "${name}"`,
            `        setupUI()`,
            `        fetchData()`,
            `    }`,
            ``,
            `    private func setupUI() {`,
            `        view.addSubview(tableView)`,
            `        tableView.frame = view.bounds`,
            `    }`,
            ``,
            `    private func fetchData() {`,
            `        // TODO: 调用 API`,
            `        tableView.reloadData()`,
            `    }`,
            `}`,
            ``,
            `// MARK: - UITableViewDataSource`,
            `extension ${name}ViewController: UITableViewDataSource {`,
            `    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {`,
            `        items.count`,
            `    }`,
            `    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {`,
            `        let cell = tableView.dequeueReusableCell(withIdentifier: "cell", for: indexPath)`,
            `        cell.textLabel?.text = items[indexPath.row].title`,
            `        return cell`,
            `    }`,
            `}`,
            ``,
            `// MARK: - UITableViewDelegate`,
            `extension ${name}ViewController: UITableViewDelegate {`,
            `    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {`,
            `        tableView.deselectRow(at: indexPath, animated: true)`,
            `    }`,
            `}`,
          ].join("\n"),
        },

        clean: {
          [`${name}Entity.swift`]: [
            `import Foundation`,
            ``,
            `// MARK: - Entity`,
            `struct ${name}Entity: Identifiable {`,
            `    let id: String`,
            `    let title: String`,
            `}`,
          ].join("\n"),

          [`${name}Repository.swift`]: [
            `import Foundation`,
            ``,
            `// MARK: - Repository`,
            `protocol ${name}Repository {`,
            `    func fetch${name}() async throws -> [${name}Entity]`,
            `}`,
            ``,
            `class ${name}RepositoryImpl: ${name}Repository {`,
            `    func fetch${name}() async throws -> [${name}Entity] {`,
            `        // TODO: 调用网络层或本地存储`,
            `        return []`,
            `    }`,
            `}`,
          ].join("\n"),

          [`${name}UseCase.swift`]: [
            `import Foundation`,
            ``,
            `// MARK: - Use Case`,
            `protocol ${name}UseCase {`,
            `    func execute() async throws -> [${name}Entity]`,
            `}`,
            ``,
            `class ${name}UseCaseImpl: ${name}UseCase {`,
            `    private let repository: ${name}Repository`,
            `    init(repository: ${name}Repository = ${name}RepositoryImpl()) {`,
            `        self.repository = repository`,
            `    }`,
            `    func execute() async throws -> [${name}Entity] {`,
            `        try await repository.fetch${name}()`,
            `    }`,
            `}`,
          ].join("\n"),

          [`${name}Presenter.swift`]: [
            `import Foundation`,
            ``,
            `// MARK: - Presenter`,
            `@MainActor`,
            `class ${name}Presenter: ObservableObject {`,
            `    @Published var items: [${name}Entity] = []`,
            `    @Published var isLoading = false`,
            ``,
            `    private let useCase: ${name}UseCase`,
            `    init(useCase: ${name}UseCase = ${name}UseCaseImpl()) {`,
            `        self.useCase = useCase`,
            `    }`,
            `    func load() async {`,
            `        isLoading = true`,
            `        defer { isLoading = false }`,
            `        items = (try? await useCase.execute()) ?? []`,
            `    }`,
            `}`,
          ].join("\n"),

          [`${name}View.swift`]: [
            `import SwiftUI`,
            ``,
            `// MARK: - View`,
            `struct ${name}View: View {`,
            `    @StateObject private var presenter = ${name}Presenter()`,
            ``,
            `    var body: some View {`,
            `        List(presenter.items) { item in`,
            `            Text(item.title)`,
            `        }`,
            `        .navigationTitle("${name}")`,
            `        .task { await presenter.load() }`,
            `    }`,
            `}`,
            ``,
            `#Preview {`,
            `    ${name}View()`,
            `}`,
          ].join("\n"),
        },
      };

      const files = fileMap[pattern];
      const outputDir = path.join(basePath, name);

      // 创建目录
      try {
        fs.mkdirSync(outputDir, { recursive: true });
      } catch (e) {
        return {
          content: [{ type: "text", text: `❌ 创建目录失败: ${outputDir}\n错误: ${e}` }],
        };
      }

      // 写入每个文件
      const createdFiles: string[] = [];
      for (const [fileName, content] of Object.entries(files)) {
        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, content, "utf-8");
        createdFiles.push(filePath);
      }

      return {
        content: [{
          type: "text",
          text: [
            `## ✅ ${name} — ${pattern.toUpperCase()} 模板已写入 Xcode 项目`,
            ``,
            `📁 目录：\\`${outputDir}\``,
            ``,
            `### 已创建文件：`,
            ...createdFiles.map(f => `- \\`${path.basename(f)}\\``),
            ``,
            `### 下一步：`,
            `1. 打开 Xcode`,
            `2. 右键项目目录 → **Add Files to "项目名"**`,
            `3. 选择 \\`${outputDir}\` 文件夹`,
            `4. 勾选 "Copy items if needed" → Add`,
          ].join("\n"),
        }],
      };
    }
  );
}