// PostToolUse hook: format the file Claude just wrote or edited with Prettier.
// Reads the hook payload from stdin. Never fails the tool call: unsupported,
// ignored, or out-of-repo files are skipped silently.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;

try {
  const payload = JSON.parse(input);
  const file = payload.tool_input?.file_path ?? payload.tool_response?.filePath;
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  const rel = file ? path.relative(root, path.resolve(file)) : '';

  if (file && existsSync(prettier) && rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
    execFileSync(
      process.execPath,
      [prettier, '--write', '--ignore-unknown', '--log-level=warn', file],
      {
        cwd: root,
        stdio: ['ignore', 'ignore', 'inherit'],
      },
    );
  }
} catch {
  // Formatting is best-effort; a syntax error will surface in lint/typecheck.
}
