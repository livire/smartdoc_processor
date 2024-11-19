// Import the Redis client from redisClient.js
const redisClient = require('./redisClient');
const fs = require('fs').promises;
const path = require('path');
const api = require('./api');

require('dotenv').config();


// Watchdog interval in milliseconds (default to 5 seconds)
const watchdogInterval = process.env.WATCHDOG_INTERVAL;

// Paths for NEW and READY folders
const PATH_VERIFIED = process.env.PATH_VERIFIED;
const PATH_UNVERIFIED = process.env.PATH_UNVERIFIED;

// Function to check Redis entries with status:NEW and move files to READY
const check = async () => {
    try {
        // Get all files tagged with 'NEW' in Redis
        const newFilesMetadata = await redisClient.getFiles("status:UNVERIFIED");

        if (newFilesMetadata.length > 0) {
            console.log(`Watchdog UNVERIFIED: found ${newFilesMetadata.length} image(s).`);

            // Process each file metadata entry
            for (const fileMetadata of newFilesMetadata) {

                const oldPath = path.join(PATH_UNVERIFIED, fileMetadata.filename);
                const newPath = path.join(PATH_VERIFIED, fileMetadata.filename);

                try {

                     // Send the POST request
                     const image_status_id = await api.image_status_post(fileMetadata, 5);

                     if (!image_status_id) {
                         console.error(
                             `Watchdog UNVERIFIED: No image_status_id received for ${fileMetadata.filename}, skipping processing.`
                         );
                         continue; // Skip the current file if image_id is missing
                     }

                     
                    // Move file from NEW folder to READY folder
                    await fs.rename(oldPath, newPath);
                    await redisClient.removeFile(fileMetadata.filename);
                    console.log(`Watchdog UNVERIFIED: moved ${fileMetadata.filename} to verified folder.`);

                } catch (fileErr) {
                    console.error(`Watchdog UNVERIFIED: failed to move ${fileMetadata.filename} to verified folder:`, fileErr);
                }
            }
        } else {
            console.log('Watchdog UNVERIFIED: no images found.');
        }

    } catch (err) {
        console.error('Watchdog UNVERIFIED: failed to check redis entries:', err);
    }
};

// Start the watchdog interval
setInterval(check, watchdogInterval);

// Graceful shutdown for the Redis client when the process exits
process.on('SIGINT', async () => {
    await redisClient.closeRedisConnection();
    console.log('Watchdog UNVERIFIED: redis connection closed');
    process.exit();
});
