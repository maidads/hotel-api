const createSuccessResponse = (data) => {
    return {
        statusCode: 200,
        body: JSON.stringify(data),
    };
};

const createErrorResponse = (message, statusCode = 500) => {
    return {
        statusCode: statusCode,
        body: JSON.stringify({ error: message }),
    };
};

module.exports = {
    createSuccessResponse,
    createErrorResponse
};
