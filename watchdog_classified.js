// Import the Redis client from redisClient.js
const redisClient = require('./redisClient');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Watchdog interval in milliseconds (default to 5 seconds)
const watchdogInterval = process.env.WATCHDOG_INTERVAL;

// Paths for NEW and READY folders
const PATH_CLASSIFIED = process.env.PATH_CLASSIFIED;
const PATH_VERIFIED = process.env.PATH_VERIFIED;

// Function to check Redis entries with status:NEW and move files to READY
const check = async () => {
    try {
        // Get all files tagged with 'NEW' in Redis
        const newFilesMetadata = await redisClient.getFiles("status:CLASSIFIED");

        if (newFilesMetadata.length > 0) {
            console.log(`Watchdog CLASSIFIED: found ${newFilesMetadata.length} image(s).`);

            // Process each file metadata entry
            for (const fileMetadata of newFilesMetadata) {

                const oldPath = path.join(PATH_CLASSIFIED, fileMetadata.filename);
                const newPath = path.join(PATH_VERIFIED, fileMetadata.filename);

                try {
                    // Move file from NEW folder to READY folder
                    await fs.rename(oldPath, newPath);
                    await redisClient.removeFile(fileMetadata.filename);
                    console.log(`Watchdog CLASSIFIED: moved ${fileMetadata.filename} to verified folder.`);

                } catch (fileErr) {
                    console.error(`Watchdog CLASSIFIED: failed to move ${fileMetadata.filename} to classified folder:`, fileErr);
                }
            }
        } else {
            console.log('Watchdog CLASSIFIED: no images found.');
        }

    } catch (err) {
        console.error('Watchdog CLASSIFIED: failed to check redis entries:', err);
    }
};

// Start the watchdog interval
setInterval(check, watchdogInterval);

// Graceful shutdown for the Redis client when the process exits
process.on('SIGINT', async () => {
    await redisClient.closeRedisConnection();
    console.log('Watchdog CLASSIFIED: redis connection closed');
    process.exit();
});
