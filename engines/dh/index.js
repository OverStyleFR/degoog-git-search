const FALLBACK_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

export default class DockerHubEngine {
  isClientExposed = false;
  name = "Docker Hub";
  bangShortcut = "dh";
  disabledByDefault = true;

  async executeSearch(query, page = 1, timeFilter, context) {
    const doFetch = context?.fetch ?? fetch;
    const params = new URLSearchParams({ query, page_size: "20" });
    if (page > 1) params.set("page", String(page));

    try {
      const response = await doFetch(
        `https://hub.docker.com/v2/search/repositories/?${params.toString()}`,
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
        .map((item) => {
          const pulls = item.pull_count?.toLocaleString
            ? item.pull_count.toLocaleString()
            : item.pull_count ?? 0;
          const snippet = [
            item.short_description,
            `⭐ ${item.star_count ?? 0}`,
            `pulls ${pulls}`,
            item.is_official ? "official" : "",
          ]
            .filter(Boolean)
            .join(" • ");
          return {
            title: item.repo_name,
            url: `https://hub.docker.com/r/${item.repo_name}`,
            snippet,
            source: this.name,
          };
        })
        .filter((r) => r.title && r.url);
    } catch (e) {
      if (e?.name === "SentinelBreach") throw e;
      return [];
    }
  }
}
