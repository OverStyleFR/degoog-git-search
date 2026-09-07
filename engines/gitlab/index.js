const FALLBACK_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

export default class GitLabProjectEngine {
  isClientExposed = false;
  name = "GitLab";
  bangShortcut = "gitlab";

  async executeSearch(query, page = 1, timeFilter, context) {
    const doFetch = context?.fetch ?? fetch;
    const params = new URLSearchParams({
      search: query,
      per_page: "20",
      order_by: "last_activity_at",
    });
    if (page > 1) params.set("page", String(page));

    try {
      const response = await doFetch(
        `https://gitlab.com/api/v4/projects?${params.toString()}`,
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
      return (Array.isArray(data) ? data : [])
        .map((item) => ({
          title: item.path_with_namespace,
          url: item.web_url,
          snippet: [
            item.description,
            item.star_count !== undefined ? `⭐ ${item.star_count}` : "",
            item.visibility ? `visibility: ${item.visibility}` : "",
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
