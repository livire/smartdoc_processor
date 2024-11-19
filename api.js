require('dotenv').config();
const axios = require('axios');

// Function to send POST request to the API
const image_post = async (fileMetadata) => {
    const payload = {
        identifier_id: fileMetadata.identifier_id,
        image_path: fileMetadata.filePath, // Full path of the image
        attributes: fileMetadata.attributes, // Attributes from Redis
    };
    
    const response = await axios.post(process.env.API_URL_IMAGE, payload);
    const image_id = response.data?.data?.image_id;
    return image_id;

};

const image_status_post = async (fileMetadata, image_status) => {
    const payload = {
        image_id: fileMetadata.image_id,
        image_status: image_status
    };
    const response = await axios.post(process.env.API_URL_IMAGE_STATUS, payload);
    const image_status_id = response.data?.data?.image_status_id;
    return image_status_id;
};

module.exports = {image_post, image_status_post}