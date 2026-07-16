/**
 * GoogleScout Worker — Finds authoritative documentation, tutorials, and whitepapers.
 *
 * Resolves search query, retrieves top URLs via SerpAPI or Gemini Search grounding,
 * fetches URL content as markdown using Jina Reader, and chunks the content.
 */

import { callAIEngine } from '../../../utils/aiClientRouter.js';

const MAX_SEARCH_RESULTS = 3;
const JINA_READER_TIMEOUT_MS = 2500;

/**
 * Split markdown content into overlapping semantic text chunks.
 * @param {string} text - The input text.
 * @param {number} chunkSize - Maximum size of each chunk.
 * @param {number} overlap - Overlap between consecutive chunks.
 * @returns {string[]} Array of text chunks.
 */
function chunkContent(text, chunkSize = 1000, overlap = 200) {
  if (!text) return [];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Fetch and convert a URL to clean markdown using Jina Reader.
 * Falls back to basic fetch + HTML strip if Jina Reader fails.
 * @param {string} url - The URL to scrape.
 * @returns {Promise<string>} Clean markdown or text.
 */
async function scrapeUrlToMarkdown(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), JINA_READER_TIMEOUT_MS);
    
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers = { 'Accept': 'text/plain' };
    if (process.env.JINA_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
    }

    const res = await fetch(jinaUrl, { headers, signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const markdown = await res.text();
      return markdown.substring(0, 15000); // Limit size to prevent memory bloat
    }
  } catch (err) {
    console.warn(`[GoogleScout] Jina Reader failed for ${url}: ${err.message}`);
  }

  // Fallback: Simple HTML strip fetch
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), JINA_READER_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      // Basic regex to strip script/style tags and HTML elements
      const clean = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return clean.substring(0, 8000);
    }
  } catch (err) {
    console.warn(`[GoogleScout] Fallback scraper failed for ${url}: ${err.message}`);
  }

  return '';
}

/**
 * Perform search using SerpAPI if available, otherwise Gemini Google Search grounding.
 * @param {string} topic
 * @param {string} context
 * @param {import('express').Request} req
 * @returns {Promise<Array<{ title: string, url: string, snippet: string }>>}
 */
async function searchWeb(topic, context, req) {
  // Option 1: SerpAPI
  if (process.env.SERPAPI_API_KEY) {
    try {
      const query = `${topic} documentation or deep-dive`;
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_API_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.organic_results)) {
          return data.organic_results.slice(0, MAX_SEARCH_RESULTS).map(r => ({
            title: r.title || '',
            url: r.link || '',
            snippet: r.snippet || ''
          }));
        }
      }
    } catch (err) {
      console.warn(`[GoogleScout] SerpAPI search failed: ${err.message}`);
    }
  }

  // Option 2: Fallback to Gemini Google Search Grounding tool
  const systemInstruction = `You are a search query router. Extract the top ${MAX_SEARCH_RESULTS} actual web URLs (documentation, blogs, or guides) for the query.
Return the results ONLY as a valid JSON array inside a markdown block:
[
  { "title": "Resource Title", "url": "https://example.com/docs", "snippet": "A short summary" }
]`;

  const prompt = `Search for documentation and guides on:
Query: "${topic}"
Context: "${context || ''}"`;

  try {
    const text = await callAIEngine({
      req,
      prompt,
      systemInstruction,
      temperature: 0.1,
      maxOutputTokens: 1024,
      timeoutMs: 3500,
      tools: [{ googleSearch: {} }],
    });

    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_SEARCH_RESULTS).map(r => ({
        title: String(r.title || ''),
        url: String(r.url || ''),
        snippet: String(r.snippet || '')
      }));
    }
  } catch (err) {
    console.warn(`[GoogleScout] Gemini search grounding failed: ${err.message}`);
  }

  return [];
}

/**
 * @param {{ topic: string, context: string, req: import('express').Request, abortSignal?: AbortSignal }} params
 * @returns {Promise<{ resources: Array<{ title: string, url: string, snippet: string, chunks: string[] }> }>}
 */
export async function executeGoogleScout({ topic, context, req, abortSignal }) {
  console.log(`[GoogleScout] Starting search for topic: "${topic}"`);
  
  // 1. Search for URLs
  const searchResults = await searchWeb(topic, context, req);
  if (searchResults.length === 0) {
    return { resources: [] };
  }

  // Check abort signal
  if (abortSignal?.aborted) return { resources: [] };

  // 2. Perform concurrent vectorized scraping for top URLs
  const scrapePromises = searchResults.map(async (resItem) => {
    if (abortSignal?.aborted) return null;
    const content = await scrapeUrlToMarkdown(resItem.url);
    const chunks = chunkContent(content);
    return {
      title: resItem.title,
      url: resItem.url,
      snippet: resItem.snippet || `Scouted authoritative resources for ${topic}.`,
      chunks
    };
  });

  const scraped = (await Promise.all(scrapePromises)).filter(Boolean);
  console.log(`[GoogleScout] Successfully scraped and chunked ${scraped.length} resources`);

  return { resources: scraped };
}
