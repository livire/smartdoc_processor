// uploadController.js
const upload_service = require('../service/upload');
const { handleError, handleSuccess } = require('./controllerHelpers');

const controller = {};

// POST: Upload files
controller.uploadFiles = async (req, res) => {
    try {
        const files = await upload_service.uploadFiles(req, res);
        handleSuccess(res, {
            message: 'Files uploaded successfully!',
            files
        });
    } catch (error) {
        handleError(res, error);
    }
};

module.exports = controller;
