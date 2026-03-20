/**
 * BRAND SCANNER MODULE
 * Crawls the user's website and uses Claude AI to extract
 * a complete brand profile: services, tone, audience, keywords.
 */

const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const supabase = require('../../lib/supabase');
const logger = require('../../lib/logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Main export: scan a website and save brand profile ────────────────────
async function scanWebsite(userId, websiteUrl) {
  logger.info(`Scanning website for user ${userId}: ${websiteUrl}`);

  try {
    // 1. Crawl the website
    const rawContent = await crawlWebsite(websiteUrl);

    // 2. Extract brand profile with Claude AI
    const brandProfile = await extractBrandProfile(rawContent, websiteUrl);

    // 3. Save to Supabase
    const { data, error } = await supabase
      .from('brand_profiles')
      .upsert({
        user_id: userId,
        website_url: websiteUrl,
        company_name: brandProfile.company_name,
        tagline: brandProfile.tagline,
        services: brandProfile.services,
        industry: brandProfile.industry,
        target_audience: brandProfile.target_audience,
        tone: brandProfile.tone,
        key_differentiators: brandProfile.key_differentiators,
        keywords: brandProfile.keywords,
        last_scanned_at: new Date().toISOString(),
        raw_text_snapshot: rawContent.substring(0, 5000),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    logger.info(`Brand profile saved for user ${userId}: ${brandProfile.company_name}`);
    return data;

  } catch (err) {
    logger.error(`Brand scan failed for ${userId}:`, err.message);
    throw err;
  }
}

// ── Crawl website and extract text content ────────────────────────────────
async function crawlWebsite(url) {
  // Ensure URL has protocol
  if (!url.startsWith('http')) url = 'https://' + url;

  const pagesToVisit = [url];
  const visited = new Set();
  let allText = '';

  // Crawl up to 8 pages
  for (const pageUrl of pagesToVisit.slice(0, 8)) {
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    try {
      const response = await axios.get(pageUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'ZenethReach-AI-Bot/1.0' }
      });

      const $ = cheerio.load(response.data);

      // Remove scripts and styles
      $('script, style, nav, footer').remove();

      // Extract text
      const pageText = $('body').text().replace(/\s+/g, ' ').trim();
      allText += `\n\n--- PAGE: ${pageUrl} ---\n${pageText.substring(0, 2000)}`;

      // Find internal links for more pages
      if (pagesToVisit.length < 8) {
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href && href.startsWith('/') && !href.includes('#')) {
            const fullUrl = new URL(href, url).href;
            if (!visited.has(fullUrl)) pagesToVisit.push(fullUrl);
          }
        });
      }
    } catch (e) {
      logger.debug(`Could not crawl ${pageUrl}: ${e.message}`);
    }
  }

  return allText;
}

// ── Use Claude AI to extract brand profile from raw text ──────────────────
async function extractBrandProfile(rawText, websiteUrl) {
  const systemPrompt = `You are a brand analyst. Extract structured brand information from website content. Return ONLY valid JSON, no commentary, no markdown.`;

  const userPrompt = `Analyze this website content and extract the brand profile.

Website: ${websiteUrl}
Content:
${rawText.substring(0, 8000)}

Return this exact JSON structure:
{
  "company_name": "The business name",
  "tagline": "Core value proposition in one sentence",
  "services": ["service1", "service2", "service3"],
  "industry": "Primary industry (e.g. Marketing Agency, SaaS, E-commerce)",
  "target_audience": "Who they serve (e.g. SMB owners, startup founders)",
  "tone": "Direct",
  "key_differentiators": ["differentiator1", "differentiator2", "differentiator3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"]
}

tone must be one of: Direct, Friendly, Professional, Casual, Expert, Inspirational`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const text = response.content[0].text.trim();

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON for brand extraction');

  return JSON.parse(jsonMatch[0]);
}

module.exports = { scanWebsite, crawlWebsite, extractBrandProfile };
