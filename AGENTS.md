# Agent Notes for `degoog-git-search`

This file contains project-specific context and lessons learned while building this DeGoog community extension store. It is intended for AI agents (and human maintainers) working on this repository.

## Project purpose

`degoog-git-search` is a DeGoog extension store that adds search engines triggered by bang shortcuts:

| Bang | Behaviour |
|---|---|
| `!git <query>` | Merges GitHub repositories **and** GitLab projects on the DeGoog results page |
| `!gh <query>` | GitHub repositories only |
| `!github <query>` | GitHub repositories only (alias) |
| `!gl <query>` | GitLab projects only |
| `!gitlab <query>` | GitLab projects only (alias) |
| `!dh <query>` | Docker Hub images |

All results are rendered inside DeGoog, not as external redirects.

## Repository structure

```text
.
├── package.json          # Required root manifest; lists all engines
├── README.md             # Human-facing usage docs
├── LICENSE
└── engines/
    ├── git/index.js      # GitHub + GitLab merged engine, bang "git"
    ├── gh/index.js       # GitHub only, bang "gh"
    ├── github/index.js   # GitHub only, bang "github"
    ├── gl/index.js       # GitLab only, bang "gl"
    ├── gitlab/index.js   # GitLab only, bang "gitlab"
    └── dh/index.js       # Docker Hub, bang "dh"
```

Each engine folder must contain at least `index.js`. `author.json` is optional but recommended.

## DeGoog engine conventions

- One `bangShortcut` per engine. There is no built-in alias support for engine bangs, so every shortcut requires its own engine folder.
- Duplicate code across alias folders is normal because DeGoog isolates each engine folder (cross-folder imports are restricted by the loader).
- The engine class must expose:
  - `name`
  - `bangShortcut`
  - `async executeSearch(query, page, timeFilter, context)` returning `[{ title, url, snippet, source }]`
- Optional: `settingsSchema` + `configure(settings)` for per-engine settings.

### `disabledByDefault` caveat (DeGoog v0.25.0)

Setting `disabledByDefault = true` on the engine class is good practice and may be honoured in future DeGoog versions, but **it is not wired in v0.25.0**.

To prevent an engine from running on every normal search while still allowing bang invocation, the instance admin must disable it via the **Default Engines** setting (`/admin` → Settings → Default Engines, or `POST /api/settings/default-engines`).

Bang-triggered searches use `searchSingleEngine(engineId, ...)` directly and ignore the default-enabled flag, so disabled engines still respond to `!bang`.

## Testing bangs without hitting the honeypot

- Normal search (`/search?q=...` or `/api/search?q=...`) counts as an unverified search and contributes to the honeypot strike limit.
- To test a bang safely, use the command endpoint:
  ```
  GET /api/command?q=!git+degoog
  ```
  This resolves the bang and returns engine results without incrementing the honeypot counter.

## Adding a new engine

1. Create `engines/<shortcut>/`.
2. Add the engine entry to `package.json` `engines[]`.
3. Implement `index.js` (see template below).
4. Commit, push, refresh the store on the instance, install/update the engine, restart DeGoog.

### Minimal engine template

```js
const FALLBACK_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";

export default class ExampleEngine {
  isClientExposed = false;
  name = "Example";
  bangShortcut = "ex";
  disabledByDefault = true;   // Good practice; see caveat above

  async executeSearch(query, page = 1, timeFilter, context) {
    const doFetch = context?.fetch ?? fetch;
    const params = new URLSearchParams({ q: query, limit: "20" });
    if (page > 1) params.set("page", String(page));

    try {
      const response = await doFetch(
        `https://api.example.com/search?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": context?.userAgent?.() || FALLBACK_UA,
          },
        },
      );
      context?.sentinel?.(response, this.name);
      if (!response.ok) return [];
      const data = await response.json();

      return (data.results ?? [])
        .map((item) => ({
          title: item.title,
          url: item.url,
          snippet: item.description || "",
          source: this.name,
        }))
        .filter((r) => r.title && r.url);
    } catch (e) {
      if (e?.name === "SentinelBreach") throw e;
      return [];
    }
  }
}
```

## Installing / updating on an instance

```bash
# Add the store repo
POST /api/store/repos
{ "url": "https://github.com/OverStyleFR/degoog-git-search.git" }

# Install/update an engine
POST /api/store/install        # first install
POST /api/store/update         # update after a push
{ "repoUrl": "https://github.com/OverStyleFR/degoog-git-search.git",
  "itemPath": "engines/<shortcut>",
  "type": "engine" }

# Restart DeGoog
docker restart docker-degoog-1
```

After install, disable the engines from default search via `/api/settings/default-engines` so they only run when invoked by bang.

## Commit conventions for this repo

Use the conventions defined by the maintainer (`commit-config` skill):

- Author: `Tom VOITURIER | OverStyleFR <personnal@tomv.ovh>`
- Sign commits with the Bitwarden SSH agent:
  ```bash
  SSH_AUTH_SOCK="$HOME/.bitwarden-ssh-agent.sock" git commit ...
  ```
- Conventional Commits: `feat(...)`, `fix(...)`, `docs(...)`, etc.
- Add an `Assisted-by:` trailer for AI-assisted work. Determine the current AI tool/model from the session metadata rather than copying an old value. Example from this session:
  ```
  Assisted-by: OpenCode:opencode-go/kimi-k2.7-code
  ```

## Community submission

To appear on https://degoog-org.github.io/community-extensions/, open a PR against `degoog-org/community-extensions` adding the repo URL to `stores.json`.

## API limits

- GitHub `search/repositories`: ~10 unauthenticated searches per minute per IP. Add a token in engine settings if you need more.
- GitLab `projects?search=`: public, no token required.
- Docker Hub `v2/search/repositories`: public, no token required.

## Pitfalls learned

- Do **not** use the `custom-bangs` plugin to implement `!git` if you want results inside DeGoog. `custom-bangs` redirects the browser externally and intercepts the bang before the engine logic can run.
- Engines are enabled for every search by default; remember to disable them via Default Engines after install.
- Use `/api/command?q=!bang+terms` for testing, not `/api/search`.
- Cross-folder imports between engine folders do not work; keep each engine self-contained.
