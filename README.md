# degoog-git-search

Search GitHub repositories and GitLab projects from [degoog](https://github.com/degoog-org/degoog) search results using bang shortcuts.

## Bangs

| Shortcut | Result |
|---|---|
| `!git <query>` | GitHub repositories **and** GitLab projects merged on the degoog results page |
| `!gh <query>` | GitHub repositories only |
| `!github <query>` | GitHub repositories only (alias) |
| `!gl <query>` | GitLab projects only |
| `!gitlab <query>` | GitLab projects only (alias) |

## Notes

- GitHub API (`search/repositories`) is limited to about 10 unauthenticated searches per minute per IP. You can add a personal access token in the engine settings if you need more.
- GitLab API (`projects?search=`) does not require a token for public project search.
- All results are shown inside degoog, not as an external redirect.

## Author

Created by [OverStyleFR](https://github.com/OverStyleFR).
