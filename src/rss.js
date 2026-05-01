/**
 * Generate a valid RSS 2.0 feed from job objects
 */
export function generateRssFeed(jobs, options = {}) {
    const {
        title = 'Visa Sponsor Jobs',
        description = 'Latest visa sponsorship jobs',
        link = 'https://visasponsor.jobs/api/jobs',
    } = options;

    const now = new Date().toUTCString();

    const items = jobs.map(job => buildItem(job)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(link)}" rel="self" type="application/rss+xml"/>
    <generator>Apify visasponsor-rss-actor</generator>
${items}
  </channel>
</rss>`;
}

function buildItem(job) {
    const title = job.title || 'Untitled Job';
    const company = job.company || '';
    const location = job.location || '';
    const visas = Array.isArray(job.visaTypes) ? job.visaTypes.join(', ') : '';
    const classification = job.classification || '';
    const link = job.url || '';
    const applyUrl = job.applyUrl || link;
    const pubDate = job.publishDate ? new Date(job.publishDate).toUTCString() : new Date().toUTCString();
    const guid = job.jobId || link;

    // Build human-readable description
    const descParts = [];
    if (company) descParts.push(`<strong>Company:</strong> ${escapeXml(company)}`);
    if (location) descParts.push(`<strong>Location:</strong> ${escapeXml(location)}`);
    if (classification) descParts.push(`<strong>Category:</strong> ${escapeXml(classification)}`);
    if (visas) descParts.push(`<strong>Visa types:</strong> ${escapeXml(visas)}`);
    if (job.description) {
        descParts.push('');
        descParts.push(escapeXml(job.description.slice(0, 1000)));
    }
    if (applyUrl) descParts.push(`<br/><a href="${escapeXml(applyUrl)}">Apply Now</a>`);

    const descHtml = descParts.join('<br/>');

    // Categories
    const categories = [];
    if (classification) categories.push(`<category>${escapeXml(classification)}</category>`);
    if (visas) {
        for (const v of (job.visaTypes || [])) {
            categories.push(`<category>${escapeXml(v)}</category>`);
        }
    }

    return `    <item>
      <title>${escapeXml(`${title}${company ? ` — ${company}` : ''}${location ? ` (${location})` : ''}`)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${descHtml}]]></description>
      ${categories.join('\n      ')}
    </item>`;
}

function escapeXml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
