import { sleep } from '../utils.js';
import { ToolSet } from '../tools.js';
import { audit } from '../app.js';

export class ResearchAgent {
    async execute(topic) {
        audit.log('ResearchAgent', 'start', 'info', topic);
        const useReal = document.getElementById('use-realtime-news')?.checked ?? true;
        let data;
        if (useReal) {
            data = await this.fetchRealNews(topic);
            if (!data || data.headlines.length === 0) {
                audit.log('ResearchAgent', 'real_news', 'warning', 'No real news found, falling back to simulated');
                data = await this.fetchSimulatedNews(topic);
            }
        } else {
            data = await this.fetchSimulatedNews(topic);
        }
        if (!data) data = { headlines: [{ text: 'No news available', sentiment: 'neutral', url: '#' }], overallSentiment: 'neutral', suggestedFunds: ['Diversified Equity Fund'] };
        data.topic = topic;
        audit.log('ResearchAgent', 'complete', 'success', `sentiment: ${data.overallSentiment}`);
        return data;
    }

    async fetchRealNews(topic) {
        const rssUrls = [
            'https://economictimes.indiatimes.com/markets/rssfeeds/2146842.cms',
            'https://economictimes.indiatimes.com/news/economy/rssfeeds/1052737.cms'
        ];
        const proxy = 'https://api.allorigins.win/get?url=';
        let articles = [];
        for (const url of rssUrls) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await fetch(proxy + encodeURIComponent(url), { signal: controller.signal });
                clearTimeout(timeout);
                const data = await response.json();
                if (data.contents) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
                    const items = xmlDoc.querySelectorAll('item');
                    for (let i = 0; i < Math.min(items.length, 20); i++) {
                        const item = items[i];
                        const title = item.querySelector('title')?.textContent || '';
                        const link = item.querySelector('link')?.textContent || '#';
                        if (title.toLowerCase().includes(topic.toLowerCase()) || topic === '') {
                            const sentiment = this.analyzeSentiment(title);
                            articles.push({ text: title, url: link, sentiment });
                        }
                    }
                }
            } catch (err) {
                audit.log('ResearchAgent', 'rss_fetch', 'error', err.message);
            } finally {
                clearTimeout(timeout);
            }
        }
        if (articles.length === 0) return null;
        articles = articles.slice(0, 5);
        const positiveCount = articles.filter(a => a.sentiment === 'positive').length;
        const negativeCount = articles.filter(a => a.sentiment === 'negative').length;
        const overall = positiveCount > negativeCount ? 'positive' : (negativeCount > positiveCount ? 'negative' : 'neutral');
        return {
            headlines: articles,
            overallSentiment: overall,
            suggestedFunds: this.getSuggestedFunds(overall, topic)
        };
    }

    analyzeSentiment(text) {
        const posWords = ['surge', 'rise', 'gain', 'upbeat', 'positive', 'upgrade', 'beat', 'strong'];
        const negWords = ['fall', 'drop', 'decline', 'downbeat', 'negative', 'downgrade', 'miss', 'weak'];
        const lower = text.toLowerCase();
        let posScore = posWords.filter(w => lower.includes(w)).length;
        let negScore = negWords.filter(w => lower.includes(w)).length;
        if (posScore > negScore) return 'positive';
        if (negScore > posScore) return 'negative';
        return 'neutral';
    }

    getSuggestedFunds(sentiment, topic) {
        if (sentiment === 'positive') {
            return [`${topic} Focused Fund`, `${topic} Sector ETF`, `Momentum Fund`];
        } else if (sentiment === 'negative') {
            return [`Balanced Advantage Fund`, `Value Discovery Fund`, `Debt Fund`];
        } else {
            return [`Diversified Equity Fund`, `Multi‑Cap Fund`];
        }
    }

    async fetchSimulatedNews(topic) {
        try {
            return await ToolSet.call('SimulatedNews', ToolSet.getNewsSentimentSimulated, topic);
        } catch (err) {
            audit.log('ResearchAgent', 'simulated_news_fallback', 'error', err.message);
            return { headlines: [{ text: 'Unable to fetch news', sentiment: 'neutral', url: '#' }], overallSentiment: 'neutral', suggestedFunds: ['Diversified Equity Fund'] };
        }
    }

    async retry(fn, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try { return await fn(); }
            catch (err) {
                audit.log('ResearchAgent', 'retry', 'warning', `attempt ${i + 1} failed: ${err.message}`);
                if (i === retries - 1) throw err;
                await sleep(500 * (i + 1));
            }
        }
    }
}