const FALLBACK_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

export default class GitSearchEngine {
  isClientExposed = false;
  name = "Git (GitHub + GitLab)";
  bangShortcut = "git";
  disabledByDefault = true;

  async executeSearch(query, page = 1, timeFilter, context) {
    const doFetch = context?.fetch ?? fetch;
    const ghParams = new URLSearchParams({ q: query, per_page: "10" });
    const glParams = new URLSearchParams({
      search: query,
      per_page: "10",
      order_by: "last_activity_at",
    });
    if (page > 1) {
      ghParams.set("page", String(page));
      glParams.set("page", String(page));
    }

    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": context?.userAgent?.() || FALLBACK_UA,
    };

    const [ghRes, glRes] = await Promise.allSettled([
      doFetch(`https://api.github.com/search/repositories?${ghParams.toString()}`, { headers }),
      doFetch(`https://gitlab.com/api/v4/projects?${glParams.toString()}`, {
        headers: { Accept: "application/json", "User-Agent": context?.userAgent?.() || FALLBACK_UA },
      }),
    ]);

    const results = [];

    if (ghRes.status === "fulfilled") {
      const response = ghRes.value;
      context?.sentinel?.(response, "GitHub");
      if (response.ok) {
        try {
          const data = await response.json();
          for (const item of data.items ?? []) {
            const snippet = [
              item.description,
              item.language ? `Lang: ${item.language}` : "",
              `⭐ ${item.stargazers_count ?? 0}`,
              `forks ${item.forks_count ?? 0}`,
            ]
              .filter(Boolean)
              .join(" • ");
            results.push({
              title: item.full_name,
              url: item.html_url,
              snippet,
              source: "GitHub",
            });
          }
        } catch {}
      }
    }

    if (glRes.status === "fulfilled") {
      const response = glRes.value;
      context?.sentinel?.(response, "GitLab");
      if (response.ok) {
        try {
          const data = await response.json();
          for (const item of Array.isArray(data) ? data : []) {
            const snippet = [
              item.description,
              item.star_count !== undefined ? `⭐ ${item.star_count}` : "",
              item.visibility ? `visibility: ${item.visibility}` : "",
            ]
              .filter(Boolean)
              .join(" • ");
            results.push({
              title: item.path_with_namespace,
              url: item.web_url,
              snippet,
              source: "GitLab",
            });
          }
        } catch {}
      }
    }

    return results.filter((r) => r.title && r.url);
  }
}
