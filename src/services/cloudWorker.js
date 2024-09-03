import fetch from 'node-fetch';
import stopword from "stopword";
import {
    acquireLock,
    addToProcessedURLs,
    isUrlProcessed,
    popQueue, releaseLock,
    removeFromProcessedURLs,
    updateWordFrequency
} from "../repositories/redisClient.js";
import {getWordFrequencies} from "../controllers/apiController.js";
import {io} from "../main.js";
import dotenv from'dotenv';

dotenv.config();


const processQueueContinuously = async () => {
    const workers = Array.from({ length: 5 }, () => processUrls());
    await Promise.allSettled(workers);
};

const processUrls = async () => {
    while (true) {
        try {
            const url = await popQueue();
            if (!url) continue;
            const lockKey = `lock:${url}`;
            const lockAcquired = await acquireLock(lockKey);
            if (!lockAcquired) continue;

            const alreadyProcessed = await isUrlProcessed(url);
            if (alreadyProcessed) {
                await releaseLock(lockKey);
                continue;
            }
            await processUrl(url);
            await releaseLock(lockKey);
        } catch (error) {
            console.error(`Error processing URL:`, error);
        }
    }
};




const processUrl = async (url) => {
    try {
        await addToProcessedURLs(url);
        const apiKey = process.env.SCRAPER_API_KEY;
        const scraperApiUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&autoparse=true`;
        const response = await fetch(scraperApiUrl);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Response is not a valid JSON");
        }

        const data = await response.json();

        if (!data.feature_bullets || !data.feature_bullets.length) {
            console.error(`No feature bullets found for URL: ${url}`);
            return;
        }

        const featureBullets = data.feature_bullets.join(' ').toLowerCase()
            .replace(/[^a-z ]+/g, " ")
            .replace(/\s+/g, " ");

        const wordArr = featureBullets.split(" ");
        const filteredWords = stopword.removeStopwords(wordArr).filter(word => word.length > 2);

        const wordMap = new Map();
        for (const word of filteredWords) {
            if (word) wordMap.set(word, (wordMap.get(word) || 0) + 1);
        }

        const mapUpdated = await updateWordFrequency(wordMap);

        if (mapUpdated) {
            const { wordArray, maxVal } = await getWordFrequencies();
            console.log('Emitting word cloud update...');
            io.emit('updateWordCloud', { map: wordArray, maxVal });
        }
    } catch (error) {
        console.error(`Error processing URL:`, error);
        await removeFromProcessedURLs(url);
    }
};



export default processQueueContinuously;
