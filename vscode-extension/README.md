# Edith Second Brain for VS Code

Connects VS Code to [Edith](https://edithapp.ai), a local second brain that stores your
sessions as linked Markdown notes on your own disk.

Install this extension and Edith appears as an MCP server in VS Code. There is no
`mcp.json` to edit and no port to look up - the extension finds the running app and
hands the editor a live connection.

## What Edith does

- Distils your sessions into linked Markdown notes, written to a folder you control.
- Serves those notes back over MCP, so the model can search them in later sessions.
- Draws the note graph and lights up whichever notes a search actually retrieved.

Notes are plain Markdown files. Edit them in any editor, or delete the index and it rebuilds.

## Requirements

The Edith desktop app, which is free:

- **macOS** - [download](https://edithapp.ai/download) (signed and notarized)
- **Windows** - [download](https://github.com/Rchari1/Edith-Windows/releases/latest)

If the app is not running when the editor starts the server, the extension offers to
open it. If it is not installed, the extension links to the download.

## Commands

| Command | What it does |
| --- | --- |
| `Edith: Show Connection Status` | Reports whether Edith is connected, and on which port |
| `Edith: Download the App` | Opens the download for your platform |

## Privacy

Everything stays on your machine. Edith serves MCP over `127.0.0.1` and the extension
talks only to that local address. No account, no API key, and nothing is sent anywhere.

## Source

[github.com/Rchari1/Edith-SecondBrain](https://github.com/Rchari1/Edith-SecondBrain)
