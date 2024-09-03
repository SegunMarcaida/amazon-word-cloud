import getRedisClient from "../redis.js";


export const enqueueUrl = async (url) => {
    try {
        const redis = getRedisClient();
        const addedToQueue = await redis?.rpush('urlQueue', url);
        const addedToSet = await redis?.sadd('processedUrlsSet', url);
        return !!(addedToQueue && addedToSet);
    } catch (error) {
        console.error("Error adding URL to queue:", error);
        return false;
    }
}


export const isUrlProcessed = async (url) => {
    try {
        const redis = getRedisClient();
        const isProcessed = await redis.sismember('processedUrlsSet', url);
        if (isProcessed === 1) return true;
        const isInQueue = await redis.lrange('urlQueue', 0, -1);

        return !!isInQueue.includes(url);

    } catch (error) {
        console.error("Error checking if URL is processed or in queue:", error);
        return false;
    }
};



export const addToProcessedURLs = async (url)=> {
    try {
        const redis = getRedisClient();
        const result = await redis?.sadd('processedUrlsSet', url);
        return result === 1;
    } catch (error) {
        console.error("Error adding URL to processed URLs:", error);
        return false;
    }
};

export const removeFromProcessedURLs = async (url)=> {
    try {
        const redis = getRedisClient();
        const result = await redis?.srem('processedUrlsSet', url);
        return result === 1;
    } catch (error) {
        console.error("Error removing URL from processed URLs:", error);
        return false;
    }
};

export const popQueue = async () => {
    try {
        const redis = getRedisClient();
        const url = await redis.blpop('urlQueue', 0);
        await redis.srem('processedUrlsSet', url[1]);
        return url[1]
    } catch (error) {
        console.error("Error popping URL from queue:", error);
        return null;
    }
}

export const updateWordFrequency = async (wordMap) => {
    if (wordMap.size === 0) return false;
    try {
        const redis = getRedisClient();
        const script = `
            local updates = cjson.decode(ARGV[1])
            for word, frequency in pairs(updates) do
                redis.call('HINCRBY', KEYS[1], word, frequency)
            end
            return true
        `;

        const updatesJson = JSON.stringify(Object.fromEntries(wordMap));

        const result = await redis.eval(script, 1, 'word-frequencies', updatesJson);
        return result === 1;
    } catch (error) {
        console.error("Error updating word frequencies in Redis:", error);
        return false;
    }
};

export const isQueueEmpty = async () => {
    const redis = getRedisClient();
    const queueLength = await redis.llen('urlQueue');
    return queueLength === 0;
};

export const acquireLock = async (key, ttl = 5000) => {
    const redis = getRedisClient();
    const result = await redis.set(key, 'locked', 'PX', ttl, 'NX');
    return result === 'OK';
};

export const releaseLock = async (key) => {
    const redis = getRedisClient();
    await redis.del(key);
};



export const loadFrequencies = async (db) => {
    const redis = getRedisClient();

    try {
        const rows = db.prepare("SELECT word, frequency FROM word_frequencies").all();

        const multi = redis.multi();

        rows.forEach(({ word, frequency }) => {
            multi.hset('word-frequencies', word, frequency);
        });

        const result = await multi.exec();

        if (result.some(([err]) => err)) {
            throw new Error("Failed to execute Redis multi command");
        }

        return true;
    } catch (error) {
        console.error("Error loading data into Redis:", error);
        return false;
    }
};

export const loadProcessedUrls = async (db) => {
    const redis = getRedisClient();

    try {
        const rows = db.prepare("SELECT url FROM processed_urls").all();

        const multi = redis.multi();

        rows.forEach(({ url }) => {
            multi.sadd('processedUrlsSet', url);
        });

        const result = await multi.exec();

        if (result.some(([err]) => err)) {
            throw new Error("Failed to execute Redis multi command");
        }

        return true;
    } catch (error) {
        console.error("Error loading processed URLs into Redis:", error);
        return false;
    }
};
