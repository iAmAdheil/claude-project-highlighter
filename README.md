# Claude Project Highlighter

Firefox/Zen WebExtension that marks Claude chats which belong to a project.

## What it does

- Watches `https://claude.ai/*`.
- Learns that a chat belongs to a project when Claude exposes project context on the current page.
- Highlights matching chats anywhere they later appear in Claude's history/sidebar.

## Why it works this way

Claude does not consistently expose a project label in the history list itself. This extension therefore keeps a local index of conversation IDs that it has seen inside a project.

It learns from two situations:

1. You open a project page, and the extension records the project chat links visible there.
2. You open a chat that Claude shows as belonging to a project, and the extension records that chat's project ID.

## Files

- `manifest.json`: MV3 extension manifest for Firefox-class browsers.
- `content.js`: Learns project membership and decorates chat rows.
- `content.css`: Visual treatment for project chats.
- `popup.html`, `popup.js`: Small status popup with a reset button.
- `scripts/build-xpi.sh`: Packages the extension as a local `.xpi`.
- `scripts/sign-xpi.sh`: Submits the extension to Mozilla for unlisted signing using AMO API credentials.

## Temporary install in Zen

Open `about:debugging#/runtime/this-firefox`, click `Load Temporary Add-on`, and select `manifest.json`.

Temporary add-ons remain installed until you fully restart Zen.

## Permanent install in Zen

Firefox-family browsers require a signed add-on for permanent installation in normal release builds.

This repo is already prepared for that:

- The manifest includes a Gecko extension ID:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "claude-project-highlighter@local"
  }
}
```

- `scripts/build-xpi.sh` creates an uploadable `.xpi`.

### 1. Build the XPI

```bash
chmod +x scripts/build-xpi.sh scripts/sign-xpi.sh
./scripts/build-xpi.sh
```

That writes a file like:

```text
dist/claude-project-highlighter-0.1.0.xpi
```

### 2. Get AMO signing credentials

1. Sign in to the Mozilla Add-on Developer Hub.
2. Create API credentials for `web-ext sign`.
3. Export them in your shell:

```bash
export AMO_JWT_ISSUER="your-amo-api-key"
export AMO_JWT_SECRET="your-amo-api-secret"
```

### 3. Submit for unlisted signing

```bash
./scripts/sign-xpi.sh
```

Equivalent raw command:

```bash
npx web-ext sign --channel=unlisted --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET"
```

Mozilla returns a signed `.xpi` in a download directory managed by `web-ext`.

### 4. Install the signed XPI in Zen

1. Open `about:addons`.
2. Click the gear icon.
3. Choose `Install Add-on From File...`.
4. Select the signed `.xpi` file.

After that, the extension remains installed across browser restarts like any normal add-on.

## Persistence behavior

Learned project-chat mappings are stored in the browser's extension local storage. They persist across Claude tab reloads and browser restarts until you clear them from the extension popup, remove the extension, or wipe the browser profile.

## Caveat

This is intentionally DOM-heuristic based because Claude does not provide a public extension API for project metadata. If Anthropic changes the UI structure, the selector heuristics may need a small update.
