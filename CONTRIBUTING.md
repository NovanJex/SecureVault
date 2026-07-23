# Contributing to SecureVault

Thank you for your interest in contributing! 🎉

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/SecureVault-Desktop.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start Tauri dev mode:
   ```bash
   npm run tauri dev
   ```

## Development Workflow

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Rust (src-tauri/src/main.rs)
- Run type checks before committing: `npm run typecheck`
- Rust checks: `cd src-tauri && cargo check`

## Commit Convention

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code restructuring
- `style:` — UI/formatting changes
- `chore:` — build/tooling

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test locally with `npm run tauri dev`
4. Ensure `npm run typecheck` passes
5. Open a PR with a clear description

## Questions?

Feel free to open an Issue for discussion.
