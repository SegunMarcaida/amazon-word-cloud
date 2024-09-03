import Redis from 'ioredis';

const getRedisClient = () => {
    return new Redis({
        host: 'localhost',
        port: 6379,
        retryStrategy(times) {
            return Math.min(times * 500, 2000);
        }
    });
}


export default getRedisClient;