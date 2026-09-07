const FALLBACK_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

export default class GitHubRepoEngine {
  isClientExposed = false;
  name = "GitHub";
  bangShortcut = "gh";
  disabledByDefault = true;

  async executeSearch(query, page = 1, timeFilter, context) {
    const doFetch = context?.fetch ?? fetch;
    const params = new URLSearchParams({ q: query, per_page: "20" });
    if (page > 1) params.set("page", String(page));

    try {
      const response = await doFetch(
        `https://api.github.com/search/repositories?${params.toString()}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": context?.userAgent?.() || FALLBACK_UA,
          },
        },
      );
      context?.sentinel?.(response, this.name);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.items ?? [])
        .map((item) => ({
          title: item.full_name,
          url: item.html_url,
          snippet: [
            item.description,
            item.language ? `Lang: ${item.language}` : "",
            `⭐ ${item.stargazers_count ?? 0}`,
            `forks ${item.forks_count ?? 0}`,
          ]
            .filter(Boolean)
            .join(" • "),
          source: this.name,
        }))
        .filter((r) => r.title && r.url);
    } catch (e) {
      if (e?.name === "SentinelBreach") throw e;
      return [];
    }
  }
}
