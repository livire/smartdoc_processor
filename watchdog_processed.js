// Import the Redis client from redisClient.js
const redisClient = require('./redisClient');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const api = require('./api');

// Watchdog interval in milliseconds (default to 5 seconds)
const watchdogInterval = process.env.WATCHDOG_INTERVAL;

// Paths for NEW and READY folders
const PATH_CLASSIFIED = process.env.PATH_CLASSIFIED;
const PATH_PROCESSED = process.env.PATH_PROCESSED;

// Function to check Redis entries with status:NEW and move files to READY
const check = async () => {
    try {
        // Get all files tagged with 'NEW' in Redis
        const newFilesMetadata = await redisClient.getFiles("status:PROCESSED");

        if (newFilesMetadata.length > 0) {
            console.log(`Watchdog PROCESSED: found ${newFilesMetadata.length} image(s).`);

            // Process each file metadata entry
            for (const fileMetadata of newFilesMetadata) {

                const oldPath = path.join(PATH_PROCESSED, fileMetadata.filename);
                const newPath = path.join(PATH_CLASSIFIED, fileMetadata.filename);

                try {

                     // Send the POST request
                     const image_status_id = await api.image_status_post(fileMetadata, 3);

                     if (!image_status_id) {
                         console.error(
                             `Watchdog PROCESSED: No image_status_id received for ${fileMetadata.filename}, skipping processing.`
                         );
                         continue; // Skip the current file if image_id is missing
                     }
 
                    // Move file from NEW folder to READY folder
                    await fs.rename(oldPath, newPath);

                    await redisClient.moveFile(fileMetadata.filename, "status:PROCESSED", "status:CLASSIFIED");


                    console.log(`Watchdog PROCESSED: moved ${fileMetadata.filename} to classified folder.`);

                } catch (fileErr) {
                    console.error(`Watchdog PROCESSED: failed to move ${fileMetadata.filename} to classified folder:`, fileErr);
                }
            }
        } else {
            console.log('Watchdog PROCESSED: no images found.');
        }

    } catch (err) {
        console.error('Watchdog PROCESSED: failed to check redis entries:', err);
    }
};

// Start the watchdog interval
setInterval(check, watchdogInterval);

// Graceful shutdown for the Redis client when the process exits
process.on('SIGINT', async () => {
    await redisClient.closeRedisConnection();
    console.log('Watchdog PROCESSED: redis connection closed');
    process.exit();
});
