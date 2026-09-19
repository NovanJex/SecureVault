# 参与贡献

感谢你有兴趣为 SecureVault 贡献力量！🎉

## 开始之前

1. Fork 本仓库
2. 克隆你的 Fork：
   ```bash
   git clone https://github.com/YOUR_USERNAME/SecureVault.git
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 启动 Tauri 开发模式：
   ```bash
   npm run tauri dev
   ```

## 开发环境

- **前端**：React 19 + TypeScript + Tailwind CSS v4
- **后端**：Rust（src-tauri/src/main.rs）
- 提交前运行类型检查：`npm run typecheck`
- Rust 检查：`cd src-tauri && cargo check`
- Rust 单元测试：`cd src-tauri && cargo test`

## 提交规范

- `feat:` — 新功能
- `fix:` — 缺陷修复
- `docs:` — 文档
- `refactor:` — 代码重构
- `style:` — 界面/格式调整
- `chore:` — 构建/工具链

## Pull Request 流程

1. 从 `main` 创建功能分支
2. 完成你的改动
3. 本地测试：`npm run tauri dev`
4. 确保 `npm run typecheck` 通过
5. 提交 PR 并附上清晰的说明

## 有疑问？

欢迎开 Issue 讨论。
