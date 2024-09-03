import {enqueueUrl, isUrlProcessed} from "../repositories/redisClient.js";
import getRedisClient from "../redis.js";


export const processUrl = async (req, res) => {
    const url = req.query.productUrl;
    if (!url) {
        return res.status(400).json({message: 'URL is required'});
    }
    try {
        const alreadyProcessedOrEnqueued = await isUrlProcessed(url);
        if (!alreadyProcessedOrEnqueued) {
            await enqueueUrl(url);
            return res.status(200).json({message: `URL enqueued: ${url}`});
        } else {
            return res.status(200).json({message: `URL already processed or enqueued: ${url}`});
        }
    } catch (error) {
        console.error('Error enqueuing URL:', error);
        return res.status(500).json({message: 'Internal server error', error: error.message});
    }
};

export const getWordFrequencies = async () => {
    try {
        const redis = getRedisClient();
        const wordFrequencies = await redis.hgetall('word-frequencies');

        const wordArray = Object.entries(wordFrequencies).map(([word, frequency]) => ({
            word,
            frequency: Number(frequency),
        }));

        let maxVal = 0;
        wordArray.forEach(({ frequency }) => {
            if (frequency > maxVal) maxVal = frequency;
        });
        return { wordArray, maxVal };
    } catch (error) {
        console.error("Error fetching word frequencies:", error);
        return { wordArray: [], maxVal: 0 };
    }
};

