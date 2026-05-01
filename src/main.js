import { Actor, log } from 'apify';
import { CheerioCrawler, RequestQueue } from 'crawlee';
import { generateRssFeed } from './rss.js';
import { parseJobList, parseJobDetail } from './parser.js';

await Actor.init();

const input = await Actor.getInput() ?? {};

const {
    country = null,
    classification = null,
    visa = null,
    keywords = null,
    maxJobs = 100,
    scrapeDetails = true,
    outputMode = 'dataset', // 'dataset' | 'rss' | 'both'
    rssTitle = 'Visa Sponsor Jobs',
    rssDescription = 'Latest visa sponsorship jobs from visasponsor.jobs',
    rssLink = 'https://visasponsor.jobs/api/jobs',
} = input;

log.info('Starting Visa Sponsor Jobs scraper', { country, classification, visa, keywords, maxJobs });

// Build start URL with filters
const params = new URLSearchParams();
if (country) params.set('country', country);
if (classification) params.set('classification', classification);
if (visa) params.set('visa', visa);
if (keywords) params.set('keywords', keywords);

const baseUrl = 'https://visasponsor.jobs/api/jobs';
const startUrl = params.toString() ? `${baseUrl}?${params}` : baseUrl;

const collectedJobs = [];
let jobCount = 0;

const requestQueue = await RequestQueue.open();
await requestQueue.addRequest({ url: startUrl, userData: { type: 'LIST', page: 1 } });

const crawler = new CheerioCrawler({
    requestQueue,
    maxRequestsPerCrawl: 500,
    maxConcurrency: 5,
    requestHandlerTimeoutSecs: 60,

    async requestHandler({ $, request, enqueueLinks }) {
        const { type, page } = request.userData;

        if (type === 'LIST') {
            log.info(`Scraping job list page ${page}: ${request.url}`);
            const jobs = parseJobList($);
            log.info(`Found ${jobs.length} jobs on page ${page}`);

            for (const job of jobs) {
                if (jobCount >= maxJobs) break;

                if (scrapeDetails) {
                    await requestQueue.addRequest({
                        url: job.url,
                        userData: { type: 'DETAIL', job },
                    });
                } else {
                    collectedJobs.push(job);
                    await Actor.pushData(job);
                }
                jobCount++;
            }

            // Paginate — find next page link
            if (jobCount < maxJobs && jobs.length > 0) {
                const nextPage = page + 1;
                const separator = request.url.includes('?') ? '&' : '?';
                const nextUrl = `${request.url.split('&page=')[0].split('?page=')[0]}${separator}page=${nextPage}`;

                // Only enqueue if we haven't hit max
                const nextPageJobs = $('a[href*="page="]').filter((_, el) => {
                    return $(el).attr('href')?.includes(`page=${nextPage}`);
                });
                if (nextPageJobs.length > 0) {
                    await requestQueue.addRequest({
                        url: `https://visasponsor.jobs${nextPageJobs.first().attr('href')}`,
                        userData: { type: 'LIST', page: nextPage },
                    });
                }
            }
        }

        if (type === 'DETAIL') {
            log.info(`Scraping job detail: ${request.url}`);
            const detail = parseJobDetail($, request.url);
            const job = { ...request.userData.job, ...detail };

            collectedJobs.push(job);
            await Actor.pushData(job);
        }
    },

    async failedRequestHandler({ request, error }) {
        log.error(`Request failed: ${request.url}`, { error: error.message });
    },
});

await crawler.run();

log.info(`Scraping complete. Collected ${collectedJobs.length} jobs.`);

// Generate RSS if needed
if (outputMode === 'rss' || outputMode === 'both') {
    const jobs = collectedJobs.length > 0
        ? collectedJobs
        : (await Actor.openDataset()).getData().then(d => d.items);

    const rssFeed = generateRssFeed(collectedJobs, {
        title: rssTitle,
        description: rssDescription,
        link: rssLink,
    });

    // Save RSS as key-value store item
    const store = await Actor.openKeyValueStore();
    await store.setValue('rss-feed', rssFeed, { contentType: 'application/rss+xml; charset=utf-8' });

    const storeId = store.id;
    const rssUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/records/rss-feed`;
    log.info(`RSS feed saved! URL: ${rssUrl}`);

    // Also save info record
    await store.setValue('OUTPUT', {
        jobsCount: collectedJobs.length,
        rssUrl,
        generatedAt: new Date().toISOString(),
        filters: { country, classification, visa, keywords },
    });
}

await Actor.exit();
