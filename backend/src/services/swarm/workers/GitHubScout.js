/**
 * GitHubScout Worker — Discovers relevant GitHub repositories and starter boilerplates.
 *
 * Directly queries api.github.com/search/repositories with targeted qualifiers
 * and limits returned fields to minimize token weight.
 */

const MAX_RESULTS = 4;

/**
 * @param {{ topic: string, context: string, req: import('express').Request, abortSignal?: AbortSignal }} params
 * @returns {Promise<{ repos: Array<{ name: string, url: string, description: string, stars: number, language: string }> }>}
 */
export async function executeGitHubScout({ topic, context, req, abortSignal }) {
  console.log(`[GitHubScout] Starting repo search for topic: "${topic}"`);

  // Target query: topic:boilerplate stars:>50 plus the core topic
  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  const queryParts = [];
  if (sanitizedTopic) {
    queryParts.push(sanitizedTopic);
  }
  queryParts.push('stars:>50');
  
  // We can look for boilerplate if it seems like a code setup query
  if (/\b(template|setup|boiler|starter|scaffold|app|framework|skeleton)\b/i.test(topic)) {
    queryParts.push('topic:boilerplate');
  }

  const query = queryParts.join(' ');
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${MAX_RESULTS}`;

  const headers = {
    'User-Agent': 'Vidhyalaya-Scout-Agent',
    'Accept': 'application/vnd.github.v3+json',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    if (abortSignal?.aborted) return { repos: [] };
    
    const res = await fetch(url, { headers, signal: abortSignal });
    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.items)) {
      const repos = data.items.map((item) => ({
        name: String(item.full_name || ''),
        url: String(item.html_url || ''),
        description: String(item.description || ''),
        stars: Number(item.stargazers_count || 0),
        language: String(item.language || item.primary_language || 'JavaScript'),
      }));

      console.log(`[GitHubScout] Successfully found ${repos.length} repositories for "${topic}"`);
      return { repos };
    }
  } catch (err) {
    console.error(`[GitHubScout] Direct API search failed: ${err.message}`);
  }

  return { repos: [] };
}

