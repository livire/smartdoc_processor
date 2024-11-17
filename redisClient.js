const Redis = require('ioredis');

// Redis status constants
const NEW = "status:NEW";
const READY = "status:READY";
const PROCESSED = "status:PROCESSED";
const CLASSIFIED = "status:CLASSIFIED";
const VERIFIED = "status:VERIFIED";

// Setup Redis client
const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT,
});

redisClient.on('connect', () => {
    console.log(`Redis is connected on port ${process.env.REDIS_PORT}`);
});

redisClient.on('error', (err) => {
    console.error(`Failed to connect to Redis on port ${process.env.REDIS_PORT}`);
});

// General function to save file metadata and assign a status tag
redisClient.saveFile = async (fileMetadata) => {
    const redisKey = fileMetadata.filename;
    const metadataFields = Object.entries(fileMetadata).flat();

    // Save metadata to Redis
    await redisClient.hset(redisKey, ...metadataFields);

    // Add file to Redis set with the provided status
    await redisClient.sadd(NEW, fileMetadata.filename);
    await redisClient.sadd(`identifier:${fileMetadata.identifier_id}`, fileMetadata.filename);
};

// General function to move a file from one status to another
redisClient.moveFile = async (filename, fromStatus, toStatus) => {
    // Ensure target status set exists before moving
    await redisClient.sadd(toStatus, filename);

    // Move the file
    await redisClient.smove(fromStatus, toStatus, filename);
};

redisClient.removeFile = async (filename) => {
    // Fetch the file metadata to get the identifier
    const fileMetadata = await redisClient.hgetall(filename);
    const identifier = fileMetadata.identifier_id;

    // Remove the file from the CLASSIFIED set
    await redisClient.srem(CLASSIFIED, filename);

    // Delete the file's metadata
    await redisClient.del(filename);

    // Check if the CLASSIFIED set is empty and delete the status tag if necessary
    const remainingClassifiedFiles = await redisClient.scard(CLASSIFIED);
    if (remainingClassifiedFiles === 0) {
        await redisClient.del(CLASSIFIED);
    }

    // Check and remove identifier tag if empty
    const identifierKey = `identifier:${identifier}`;
    await redisClient.srem(identifierKey, filename);
    const remainingIdentifierFiles = await redisClient.scard(identifierKey);
    if (remainingIdentifierFiles === 0) {
        await redisClient.del(identifierKey);
    }
};


// General function to get all files by status
redisClient.getFiles = async (status) => {
    const filenames = await redisClient.smembers(status);
    const filesMetadata = [];

    for (const filename of filenames) {
        const fileMetadata = await redisClient.hgetall(filename);
        filesMetadata.push(fileMetadata);
    }

    return filesMetadata;
};

// Close Redis connection
redisClient.closeRedisConnection = async () => {
    await redisClient.quit();
    console.log('Redis client connection closed');
};

// Export redisClient and helper functions
module.exports = redisClient;
