import getRedisClient from "../redis.js";
import db from "../database.js";

export const syncRedisToSQLite = () => {
    const redis = getRedisClient();
    redis.hgetall('word-frequencies', (err, wordFrequencies) => {
        if (err) {
            console.error("Error fetching data from Redis:", err);
            return;
        }

        redis.smembers('processedUrlsSet', (err, processedUrls) => {
            if (err) {
                console.error("Error fetching processed URLs from Redis:", err);
                return;
            }

            const insertWordStmt = db.prepare(`
                INSERT INTO word_frequencies (word, frequency)
                VALUES (?, ?)
                ON CONFLICT(word)
                    DO UPDATE SET frequency = excluded.frequency
            `);

            const insertUrlStmt = db.prepare(`
                INSERT INTO processed_urls (url)
                VALUES (?)
                ON CONFLICT(url)
                    DO NOTHING
            `);

            const transaction = db.transaction(() => {
                if (wordFrequencies) {
                    for (const [word, frequency] of Object.entries(wordFrequencies)) {
                        insertWordStmt.run(word, parseInt(frequency, 10));
                    }
                }
                if (processedUrls) {
                    for (const url of processedUrls) {
                        insertUrlStmt.run(url);
                    }
                }
            });

            try {
                transaction();
            } catch (syncError) {
                console.error("Error syncing data to SQLite:", syncError);
            }
        });
    });
};






