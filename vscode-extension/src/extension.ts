import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as vscode from 'vscode';

/** Edith binds the first free port in this range, so the connection has to be discovered. */
const PORTS = [4319, 4320, 4321, 4322];
const MAC_DOWNLOAD = 'https://edithapp.ai/download';
const WIN_DOWNLOAD = 'https://github.com/Rchari1/Edith-Windows/releases/latest';

/**
 * A live server answers even when it rejects the request - Edith replies 406 to a POST
 * without the MCP headers. A refused connection or a timeout both mean "not there yet";
 * waitForPort() is what tolerates a slow start.
 */
async function isUp(port: number, timeoutMs = 600): Promise<boolean> {
  try {
    await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs)
    });
    return true;
  } catch {
    return false;
  }
}

async function findPort(): Promise<number | undefined> {
  for (const port of PORTS) if (await isUp(port)) return port;
  return undefined;
}

function appPath(): string | undefined {
  const candidates =
    process.platform === 'darwin'
      ? ['/Applications/Edith.app']
      : process.platform === 'win32'
        ? [
            path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Edith', 'Edith.exe'),
            path.join(process.env.PROGRAMFILES ?? '', 'Edith', 'Edith.exe')
          ]
        : [];
  return candidates.find((p) => p && fs.existsSync(p));
}

function downloadUrl(): string {
  return process.platform === 'win32' ? WIN_DOWNLOAD : MAC_DOWNLOAD;
}

function launch(target: string): void {
  const cmd = process.platform === 'darwin' ? `open -a ${JSON.stringify(target)}` : `start "" ${JSON.stringify(target)}`;
  exec(cmd, () => undefined);
}

/** Wait for the app to finish starting, so the first tool call does not race it. */
async function waitForPort(timeoutMs = 25_000): Promise<number | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const port = await findPort();
    if (port) return port;
    await new Promise((r) => setTimeout(r, 750));
  }
  return undefined;
}

export function activate(context: vscode.ExtensionContext): void {
  const changed = new vscode.EventEmitter<void>();

  // Typed to the HTTP definition so `server.uri` is known to exist.
  const provider: vscode.McpServerDefinitionProvider<vscode.McpHttpServerDefinition> = {
      onDidChangeMcpServerDefinitions: changed.event,

      // Called eagerly by the editor, so this only looks - it never prompts.
      provideMcpServerDefinitions: async () => {
        const port = (await findPort()) ?? PORTS[0];
        return [
          new vscode.McpHttpServerDefinition('Edith', vscode.Uri.parse(`http://127.0.0.1:${port}/mcp`))
        ];
      },

      // Called when the editor wants the server running - prompting is allowed here.
      resolveMcpServerDefinition: async (server) => {
        const running = await findPort();
        if (running) {
          server.uri = vscode.Uri.parse(`http://127.0.0.1:${running}/mcp`);
          return server;
        }

        const installed = appPath();
        if (installed) {
          launch(installed);
          const port = await waitForPort();
          if (!port) {
            void vscode.window.showWarningMessage('Edith did not finish starting. Open it and try again.');
            return undefined;
          }
          server.uri = vscode.Uri.parse(`http://127.0.0.1:${port}/mcp`);
          return server;
        }

        const choice = await vscode.window.showInformationMessage(
          'Edith is not installed. It is a free local app that stores your sessions as Markdown notes.',
          'Download Edith'
        );
        if (choice) await vscode.env.openExternal(vscode.Uri.parse(downloadUrl()));
        return undefined;
      }
  };

  context.subscriptions.push(
    changed,
    vscode.lm.registerMcpServerDefinitionProvider('edith', provider),

    vscode.commands.registerCommand('edith.download', async () => {
      await vscode.env.openExternal(vscode.Uri.parse(downloadUrl()));
    }),

    vscode.commands.registerCommand('edith.status', async () => {
      const port = await findPort();
      if (port) {
        void vscode.window.showInformationMessage(`Edith is connected on port ${port}.`);
        return;
      }
      const installed = appPath();
      const action = await vscode.window.showWarningMessage(
        installed ? 'Edith is installed but not running.' : 'Edith is not installed.',
        installed ? 'Open Edith' : 'Download Edith'
      );
      if (!action) return;
      if (installed) {
        launch(installed);
        if (await waitForPort()) changed.fire();
      } else {
        await vscode.env.openExternal(vscode.Uri.parse(downloadUrl()));
      }
    })
  );
}

export function deactivate(): void {}
