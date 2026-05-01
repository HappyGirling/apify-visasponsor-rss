# Visa Sponsor Jobs → RSS Scraper (Apify Actor)

Scrapes [visasponsor.jobs](https://visasponsor.jobs/api/jobs) and outputs:
- **Dataset** of structured job objects
- **RSS feed** accessible via a public URL

---

## 🚀 Deploy to Apify

### Option A — Apify CLI (recommended)

```bash
npm install -g apify-cli
apify login
apify push
```

### Option B — GitHub Integration

1. Push this folder to a GitHub repo
2. In Apify Console → **Actors** → **Create new** → **Link GitHub repo**
3. Select your repo and set source to `./` (root)
4. Click **Build**

---

## ⚙️ Input Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `country` | string | — | Filter: `United-States`, `United-Kingdom`, `Australia`, etc. |
| `classification` | string | — | Filter: `Information-Technology`, `Engineering`, `Health-And-Care`, etc. |
| `visa` | string | — | Filter: `H-1B`, `Skilled Worker`, etc. |
| `keywords` | string | — | Keyword search |
| `maxJobs` | integer | 100 | Max jobs to collect |
| `scrapeDetails` | boolean | true | Visit each job page for full description |
| `outputMode` | string | `both` | `dataset` / `rss` / `both` |
| `rssTitle` | string | Visa Sponsor Jobs | RSS feed title |
| `rssDescription` | string | — | RSS feed description |

---

## 📤 Outputs

### Dataset
Each item contains:
```json
{
  "jobId": "374a1a12ea99421e89856f7630b4aec5",
  "title": "Software Engineer",
  "company": "Acme Corp",
  "location": "San Francisco, California, United States",
  "classification": "Information Technology",
  "visaTypes": ["H-1B", "OPT"],
  "publishDate": "2026-05-01T00:00:00.000Z",
  "description": "Full job description...",
  "applyUrl": "https://linkedin.com/...",
  "logoUrl": "https://static.visasponsor.jobs/...",
  "url": "https://visasponsor.jobs/api/jobs/374a.../Software-Engineer",
  "scrapedAt": "2026-05-01T12:00:00.000Z"
}
```

### RSS Feed
Saved to Key-Value Store as `rss-feed`. Access URL:
```
https://api.apify.com/v2/key-value-stores/{STORE_ID}/records/rss-feed
```

The run also saves an `OUTPUT` record with the RSS URL for easy retrieval.

---

## 🔄 Scheduling (Cron)

To get fresh jobs automatically:
1. Apify Console → Your Actor → **Schedules** tab
2. Set cron: `0 */6 * * *` (every 6 hours)
3. The RSS URL stays the same — subscribe once in your RSS reader

---

## 📡 Use the RSS in readers

Copy the RSS URL and add it to:
- **Feedly**, **Inoreader**, **NewsBlur** — paste as a feed URL
- **Zapier/Make** — trigger on new RSS items → email, Slack, Notion, etc.
- **n8n** — RSS trigger node

---

## Local Development

```bash
npm install
npx apify run
```
