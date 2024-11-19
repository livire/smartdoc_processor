
const redisClient = require('./redisClient');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const api = require('./api');

// Watchdog interval in milliseconds (default to 5 seconds)
const watchdogInterval = process.env.WATCHDOG_INTERVAL;

// Paths for NEW and READY folders
const PATH_NEW = process.env.PATH_NEW;
const PATH_READY = process.env.PATH_READY;

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
                    // Send the POST request
                    const image_id = await api.image_post(fileMetadata);

                    if (!image_id) {
                        console.error(
                            `Watchdog NEW: No image_id received for ${fileMetadata.filename}, skipping processing.`
                        );
                        continue; // Skip the current file if image_id is missing
                    }

                    // Update Redis with the new image_id
                    await redisClient.updateFile(fileMetadata.filename, { image_id });

                    // Move file from NEW folder to READY folder
                    await fs.rename(oldPath, newPath);

                    // Update Redis status
                    await redisClient.moveFile(fileMetadata.filename, "status:NEW", "status:READY");

                    console.log(
                        `Watchdog NEW: processed ${fileMetadata.filename}, assigned image_id ${image_id}, and moved to READY folder.`
                    );
                } catch (error) {
                    console.error(
                        `Watchdog NEW: failed to process ${fileMetadata.filename}, skipping:`,
                        error.message
                    );
                }
            }
        } else {
            console.log('Watchdog NEW: no images found.');
        }
    } catch (err) {
        console.error('Watchdog NEW:', err.message);
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
