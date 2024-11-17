// Import the Redis client from redisClient.js
const redisClient = require('./redisClient');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Watchdog interval in milliseconds (default to 5 seconds)
const watchdogInterval = process.env.WATCHDOG_INTERVAL;

// Paths for NEW and READY folders
const PATH_NEW = process.env.PATH_NEW;
const PATH_READY = process.env.PATH_READY;

// Function to check Redis entries with status:NEW and move files to READY
const check = async () => {
    try {
        // Get all files tagged with 'NEW' in Redis
        const newFilesMetadata = await redisClient.getFiles("status:NEW");

        if (newFilesMetadata.length > 0) {
            console.log(`Watchdog NEW: found ${newFilesMetadata.length} image(s).`);

            // Process each file metadata entry
            for (const fileMetadata of newFilesMetadata) {

                const oldPath = path.join(PATH_NEW, fileMetadata.filename);
                const newPath = path.join(PATH_READY, fileMetadata.filename);

                try {
                    // Move file from NEW folder to READY folder
                    await fs.rename(oldPath, newPath);

                    await redisClient.moveFile(fileMetadata.filename, "status:NEW", "status:READY");

                    console.log(`Watchdog NEW: moved ${fileMetadata.filename} to READY folder.`);

                } catch (fileErr) {
                    console.error(`Watchdog NEW: failed to move ${fileMetadata.filename} to READY folder:`, fileErr);
                }
            }
        } else {
            console.log('Watchdog NEW: no images found.');
        }

    } catch (err) {
        console.error('Watchdog NEW:', err);
    }
};

// Start the watchdog interval
setInterval(check, watchdogInterval);

// Graceful shutdown for the Redis client when the process exits
process.on('SIGINT', async () => {
    await redisClient.closeRedisConnection();
    console.log('Watchdog NEW: redis connection closed');
    process.exit();
});
