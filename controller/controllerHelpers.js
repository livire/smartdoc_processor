// controllerHelpers.js
const handleError = (res, error) => {
  let status = 500; // Default to internal server error for unexpected errors

  // Log the error message
  console.error(`[Error] ${error.message}`);

  // Send the response
  res.status(status).json({
    message: error.message,
  });
};

// const handleSuccess = (res, data = null) => {
//   // Log success with a stringified version of data
//   console.log(`[Success]`, JSON.stringify(data, null, 2));  // Pretty-printing the object

//   res.status(200).json({ data });
// };

const handleSuccess = (res, data = null) => {
  // Remove `buffer` property from file objects if `files` exists
  if (data?.files?.files) {
    data.files.files = data.files.files.map(({ buffer, ...rest }) => rest);
  }

  // Log success with a stringified version of data
  console.log(`[Success]`, JSON.stringify(data, null, 2)); // Pretty-printing the object

  // Respond with the updated data
  res.status(200).json({ data });
};


module.exports = {
  handleError,
  handleSuccess,
};
