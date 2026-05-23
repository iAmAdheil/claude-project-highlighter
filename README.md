# Claude Project Highlighter

Claude Project Highlighter is a Firefox/Zen WebExtension that makes Claude project chats stand out in the sidebar, so it is much easier to tell which chats belong to a project before you clean things up.

## Get It

Install it from Firefox Add-ons: [Claude Project Highlighter on addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/claude-project-highlighter/)

## Why

I made this because Claude makes it a little too easy to lose track of which chats are tied to a project. When you are cleaning up old conversations, project chats can look almost identical to regular ones, which makes accidental deletes feel way too possible.

This extension adds a persistent visual highlight to chats that belong to Claude projects, so they are easier to spot at a glance.

## How It Works

The extension watches `https://claude.ai/*` and keeps a local index of chat IDs that belong to projects.

It learns project membership from two kinds of pages:

1. Project pages, where Claude exposes links to chats inside a project.
2. Individual chat pages, when Claude exposes enough project context to associate the current chat with a project.

Once a chat is learned, it stays highlighted anywhere it appears in Claude's history until the stored mapping is cleared.

## Installation

### Firefox Add-ons

The easiest option is to install it directly from Mozilla's marketplace:

[Install Claude Project Highlighter](https://addons.mozilla.org/en-US/firefox/addon/claude-project-highlighter/)

## Privacy

This extension stores learned project-chat mappings in the browser's local extension storage. It does not require any external backend and does not intentionally transmit that data anywhere.

## Limitations

Claude does not expose a public API for project metadata in chat history, so this extension relies on DOM heuristics. If Anthropic changes Claude's UI structure, the detection logic may need updates.

## License

See [LICENSE](./LICENSE).
