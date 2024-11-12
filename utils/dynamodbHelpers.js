
function buildFilterExpression(queryParams) {
    let filterExpressions = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};

    filterExpressions.push("begins_with(PK, :pkPrefix)");
    expressionAttributeValues[":pkPrefix"] = { S: "Booking#" };

    if (queryParams.startDate && queryParams.endDate) {
        filterExpressions.push("#startDate >= :startDate AND #endDate <= :endDate");
        expressionAttributeNames["#startDate"] = "StartDate";
        expressionAttributeNames["#endDate"] = "EndDate";
        expressionAttributeValues[":startDate"] = { S: queryParams.startDate };
        expressionAttributeValues[":endDate"] = { S: queryParams.endDate };
    }

    if (queryParams.name) {
        filterExpressions.push("contains(#name, :name)");
        expressionAttributeNames["#name"] = "Name";
        expressionAttributeValues[":name"] = { S: queryParams.name };
    }

    return {
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    };
}


function buildKeyConditionExpression(bookingId) {
    return {
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
            ":pk": { S: `Booking#${bookingId}` },
        },
    };
}

module.exports = {
    buildFilterExpression,
    buildKeyConditionExpression,
};
