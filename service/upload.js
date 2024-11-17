const multer = require("multer");
const fs = require("fs");
const path = require("path");
const redisClient = require("../redisClient");

const PATH_NEW = process.env.PATH_NEW; // Directory to save files
const ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES
  ? process.env.ALLOWED_FILE_TYPES.split(",")
  : ["image/jpeg", "image/png", "image/gif"];
const FILE_SIZE_LIMIT = eval(process.env.FILE_SIZE_LIMIT) || 5 * 1024 * 1024; // 5MB
const FILE_COUNT = eval(process.env.FILE_COUNT) || 10;

// Setup multer with memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed types: " + ALLOWED_FILE_TYPES.join(", ")));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMIT,
    files: FILE_COUNT,
  },
}).fields([
  { name: "files", maxCount: FILE_COUNT }, // For file uploads
  { name: "identifier_id" }, // For identifier_id
  { name: "attributes" }, // For attributes
]);

const uploadFiles = (req) => {
  return new Promise((resolve, reject) => {
    upload(req, null, (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_COUNT") {
          reject(new Error(`Cannot upload more than ${FILE_COUNT} file(s) at once.`));
        } else if (error.code === "LIMIT_FILE_SIZE") {
          reject(new Error(`File size exceeds the limit of ${FILE_SIZE_LIMIT / (1024 * 1024)}MB.`));
        } else {
          reject(error);
        }
      } else if (!req.files || !req.files["files"]) {
        reject(new Error("No files uploaded."));
      } else {
        try {
          const identifierId = req.body.identifier_id;
          const attributes = req.body.attributes ? JSON.parse(req.body.attributes) : null;

          if (!identifierId || !attributes) {
            reject(new Error("Missing required fields: identifier_id or attributes."));
          }

          // Ensure PATH_NEW exists
          if (!fs.existsSync(PATH_NEW)) {
            fs.mkdirSync(PATH_NEW, { recursive: true });
          }

          // Process file metadata and save to disk and Redis
          const fileMetadataList = req.files["files"].map((file) => {
            const extension = path.extname(file.originalname); // Get original file extension
            const filename = `${identifierId}-${Date.now()}${extension}`; // Include extension
            const filePath = path.join(PATH_NEW, filename);

            // Save the file buffer to disk
            fs.writeFileSync(filePath, file.buffer);

            return {
              filename,
              filePath,
              identifier_id: identifierId,
              is_active: 1,
              attributes: JSON.stringify(attributes), // Convert attributes to a JSON string
            };
          });

          // Save metadata to Redis
          Promise.all(fileMetadataList.map((data) => redisClient.saveFile(data)))
            .then(() => {
              resolve({
                message: `${req.files["files"].length} file(s) uploaded successfully`,
                files: fileMetadataList.map(({ filename, filePath, identifier_id, attributes }) => ({
                  filename,
                  filePath,
                  identifier_id,
                  attributes,
                })), // Exclude buffer
              });
            })
            .catch((redisError) => {
              reject(redisError);
            });
        } catch (parseError) {
          reject(new Error("Failed to parse attributes JSON."));
        }
      }
    });
  });
};

module.exports = {
  uploadFiles,
};
