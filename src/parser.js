/**
 * Parse the job list page and extract job summaries
 */
export function parseJobList($) {
    const jobs = [];

    // Each job is a link wrapping a job card
    $('a[href*="/api/jobs/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');

        // Skip navigation links (no UUID pattern)
        if (!href || !href.match(/\/api\/jobs\/[a-f0-9]{32}\//)) return;

        const url = href.startsWith('http') ? href : `https://visasponsor.jobs${href}`;

        // Extract job ID from URL
        const idMatch = href.match(/\/api\/jobs\/([a-f0-9]{32})\//);
        const jobId = idMatch ? idMatch[1] : null;

        // Title — usually the first strong/h text or first text node
        const title = $el.find('h2, h3, [class*="title"]').first().text().trim()
            || $el.text().split('\n').map(s => s.trim()).filter(Boolean)[0]
            || '';

        // Company name
        const company = $el.find('[class*="company"], [class*="employer"]').first().text().trim()
            || extractLineAfterDash($el.text());

        // Location — look for text near flag images
        const locationText = $el.find('img[src*="flags"]').parent().text().trim()
            || extractLocation($el.text());

        // Classification
        const classification = $el.find('img[src*="classifications"]').parent().text().trim() || '';

        // Visa types — text nodes that look like visa codes
        const visaTypes = [];
        $el.find('*').each((_, node) => {
            const text = $(node).clone().children().remove().end().text().trim();
            if (/^(H-1B|H-2A|H-2B|OPT|CPT|186|482|485|PNP|TFWP|AEWV|EU Blue Card|Skilled Worker|Employment Pass|S Pass|Tech Visa|Critical Skills|Highly Skilled Migrant|All other\/unspecified|Cap-exempt|Green List|Health and Care Worker)$/.test(text)) {
                if (!visaTypes.includes(text)) visaTypes.push(text);
            }
        });

        // Publish date
        const dateMatch = $el.text().match(/\d{2}-\d{2}-\d{4}/);
        const publishDate = dateMatch ? parseDateDMY(dateMatch[0]) : null;

        // Logo
        const logoUrl = $el.find('img[src*="employer-logos"]').attr('src') || null;

        if (jobId && title) {
            jobs.push({
                jobId,
                title: cleanText(title),
                company: cleanText(company),
                location: cleanText(locationText),
                classification: cleanText(classification),
                visaTypes: visaTypes.filter(v => v !== 'All other/unspecified'),
                publishDate,
                logoUrl,
                url,
                scrapedAt: new Date().toISOString(),
            });
        }
    });

    return jobs;
}

/**
 * Parse a job detail page
 */
export function parseJobDetail($, url) {
    // Title
    const title = $('h1').first().text().trim()
        || $('h2').first().text().trim();

    // Company
    const company = $('h2, [class*="company"]').filter((_, el) => {
        const text = $(el).text().trim();
        return text && text !== title;
    }).first().text().trim();

    // Apply link
    const applyUrl = $('a').filter((_, el) => {
        return $(el).text().toLowerCase().includes('apply');
    }).first().attr('href') || null;

    // Job description — main content block
    let description = '';
    $('p, li').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) {
            description += text + '\n';
        }
    });

    // Posted date
    const bodyText = $('body').text();
    const dateMatch = bodyText.match(/posted on\s+(\w+ \d+,\s+\d{4})/i)
        || bodyText.match(/Publish date\s+(\d{2}-\d{2}-\d{4})/i);
    const postedDateRaw = dateMatch ? dateMatch[1] : null;
    const publishDate = postedDateRaw ? parsePostedDate(postedDateRaw) : null;

    // Location
    const locationText = $('img[src*="flags"]').parent().text().trim();

    // Visa types from detail page
    const visaTypes = [];
    $('*').each((_, node) => {
        const text = $(node).clone().children().remove().end().text().trim();
        if (/^(H-1B|H-2A|H-2B|OPT|CPT|186|482|485|PNP|TFWP|AEWV|EU Blue Card|Skilled Worker|Employment Pass|S Pass|Tech Visa|Critical Skills|Highly Skilled Migrant|Cap-exempt|Green List|Health and Care Worker)$/.test(text)) {
            if (!visaTypes.includes(text)) visaTypes.push(text);
        }
    });

    // Logo
    const logoUrl = $('img[src*="employer-logos"]').first().attr('src') || null;

    return {
        title: cleanText(title),
        company: cleanText(company),
        location: cleanText(locationText),
        description: cleanText(description).slice(0, 5000),
        applyUrl,
        publishDate,
        visaTypes,
        logoUrl,
        url,
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cleanText(str = '') {
    return str.replace(/\s+/g, ' ').trim();
}

function extractLineAfterDash(text) {
    const match = text.match(/---\s*\n?\s*(.+)/);
    return match ? match[1].trim() : '';
}

function extractLocation(text) {
    // Look for pattern: City, State/Province, Country
    const match = text.match(/([A-Z][a-z]+ ?[a-z]*,\s*[A-Z][a-z ]+,\s*[A-Z][a-z ]+)/);
    return match ? match[1] : '';
}

function parseDateDMY(str) {
    // "30-04-2026" → ISO
    const [d, m, y] = str.split('-');
    return new Date(`${y}-${m}-${d}`).toISOString();
}

function parsePostedDate(str) {
    try {
        return new Date(str).toISOString();
    } catch {
        return str;
    }
}
