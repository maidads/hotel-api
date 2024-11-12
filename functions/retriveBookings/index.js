const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { createSuccessResponse, createErrorResponse } = require('../../utils/responses');
const dynamoDb = require('../../config/dynamodb');


module.exports.handler = async (event, context) => {
    console.log("Retrieve bookings!");

    try {
        const params = {
            TableName: process.env.DYNAMODB_TABLE,
            FilterExpression: "begins_with(PK, :pkPrefix)",
            ExpressionAttributeValues: {
                ":pkPrefix": { S: "Booking#" },
            },
        };

        const command = new ScanCommand(params);
        const data = await dynamoDb.send(command);

        const bookings = data.Items.map(item => {
            const itemData = unmarshall(item);

            const roomTypes = itemData.Rooms.map(room => room.Type);

            return {
                bookingNumber: itemData.BookingID,
                checkInDate: itemData.StartDate,
                checkOutDate: itemData.EndDate,
                numberOfGuests: itemData.NumberOfGuests,
                numberOfRooms: itemData.Rooms.length,
                bookerName: itemData.Name,
                roomTypes: roomTypes,
            };
        });

        return createSuccessResponse(bookings);

    } catch (error) {
        console.error("Error retrieving bookings:", error);
        return createErrorResponse("Could not retrieve bookings");
    }
};
