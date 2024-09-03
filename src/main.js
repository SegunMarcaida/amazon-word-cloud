import express from "express";
import http from 'http';
import apiRouter from "./routes/apiRouter.js";
import db, {startDB} from "./database.js";
import processQueueContinuously from "./services/cloudWorker.js";
import {isQueueEmpty, loadFrequencies, loadProcessedUrls} from "./repositories/redisClient.js";
import {Server} from 'socket.io';
import {syncRedisToSQLite} from "./repositories/sqliteClient.js";

const app = express()
const server = http.createServer(app);
export const io = new Server(server);
const PORT = 8080;

app.set('views', './src/views')
app.set("view engine", "ejs")
app.use(express.json());
app.use(express.urlencoded({extended: false}))
app.use("/", apiRouter)

let connectedUsers = 0;

io.on('connection', async (socket) => {
    connectedUsers++;
    if (connectedUsers === 1) {
        await loadProcessedUrls(db);
        await loadFrequencies(db);
    }
    console.log('a user connected', connectedUsers);

    socket.on('disconnect', async () => {
        connectedUsers--;
        console.log('user disconnected', connectedUsers);

        if (connectedUsers === 0) {
            let retries = 5;
            while (retries > 0 && !(await isQueueEmpty())) {
                console.log('Waiting for queue to empty...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                retries--;
            }
            if (await isQueueEmpty()) {
                try {
                    await syncRedisToSQLite();
                    console.log('Synchronization completed successfully.');
                } catch (error) {
                    console.error('Error during synchronization:', error);
                }
            } else {
                console.log('Queue did not empty, skipping synchronization.');
            }
        }
    });
});

server.listen(
    PORT,
    () => console.log(`Listening on port ${PORT} -> http://localhost:${PORT}`)
)

startDB();
await loadProcessedUrls(db);
await loadFrequencies(db);
processQueueContinuously();