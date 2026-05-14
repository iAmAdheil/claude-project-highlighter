# Claude Project Highlighter

Claude Project Highlighter is a Firefox/Zen WebExtension that makes Claude project chats visually distinct in the sidebar, reducing the chance of deleting them while cleaning up chat history.

## Why

Claude does not clearly indicate in the main chat history whether a conversation belongs to a project. This extension adds a persistent visual highlight for chats that have been identified as project-linked.

## How It Works

The extension watches `https://claude.ai/*` and keeps a local index of chat IDs that belong to projects.

It learns project membership from two kinds of pages:

1. Project pages, where Claude exposes links to chats inside a project.
2. Individual chat pages, when Claude exposes enough project context to associate the current chat with a project.

Once a chat is learned, it stays highlighted anywhere it appears in Claude's history until the stored mapping is cleared.

## Features

- Highlights chats that belong to Claude projects
- Persists learned project-chat mappings in local browser storage
- Includes a small popup to inspect the learned count and clear stored markers
- Works with Firefox-class browsers such as Zen

## Installation

### Temporary install

For local testing in Firefox or Zen:

1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on`
3. Select [`manifest.json`](./manifest.json)

Temporary add-ons remain installed until the browser is fully restarted.

### Permanent install

Firefox-family browsers require signed add-ons for permanent installation in normal release builds.

1. Build the extension package:

```bash
chmod +x scripts/build-xpi.sh scripts/sign-xpi.sh
./scripts/build-xpi.sh
```

2. Sign the package through Mozilla as an unlisted add-on:

```bash
export AMO_JWT_ISSUER="your-amo-api-key"
export AMO_JWT_SECRET="your-amo-api-secret"
./scripts/sign-xpi.sh
```

3. Install the signed `.xpi` from `about:addons` using `Install Add-on From File...`

## Development

Project structure:

- `manifest.json`: Extension manifest
- `content.js`: DOM observation, project detection, and highlight logic
- `content.css`: Sidebar highlight styling
- `popup.html`, `popup.js`: Popup UI and storage controls
- `scripts/build-xpi.sh`: Packages the extension as `.xpi`
- `scripts/sign-xpi.sh`: Submits the extension for Mozilla unlisted signing

Useful commands:

```bash
node --check content.js
node --check popup.js
./scripts/build-xpi.sh
```

## Privacy

This extension stores learned project-chat mappings in the browser's local extension storage. It does not require any external backend and does not intentionally transmit that data anywhere.

## Limitations

Claude does not expose a public API for project metadata in chat history, so this extension relies on DOM heuristics. If Anthropic changes Claude's UI structure, the detection logic may need updates.

## License

See [LICENSE](./LICENSE).
