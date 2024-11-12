const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    // 1. Parse input data from the request
    const data = JSON.parse(event.body);

    // 2. Validate input data
    if (
      !data.bookingId ||
      !data.checkInDate ||
      !data.checkOutDate ||
      !data.roomTypes ||
      !data.numberOfGuests
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // 3. Check if room count matches the number of guests
    const totalCapacity = data.roomTypes.reduce((sum, room) => {
      if (room.type === "Single") return sum + room.count * 1;
      if (room.type === "Double") return sum + room.count * 2;
      if (room.type === "Suite") return sum + room.count * 3;
      return sum;
    }, 0);

    if (totalCapacity < data.numberOfGuests) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Number of rooms does not match the number of guests",
        }),
      };
    }

    // 4. Define keys for the booking to be updated
    const bookingKey = {
      PK: `BOOKING#${data.bookingId}`,
      SK: "METADATA",
    };

    // 5. Create update expressions
    const updateExpression = `
      SET guestName = :guestName,
          checkInDate = :checkInDate,
          checkOutDate = :checkOutDate,
          roomTypes = :roomTypes,
          numberOfGuests = :numberOfGuests
    `;
    const expressionAttributeValues = {
      ":guestName": data.guestName,
      ":checkInDate": data.checkInDate,
      ":checkOutDate": data.checkOutDate,
      ":roomTypes": data.roomTypes,
      ":numberOfGuests": data.numberOfGuests,
    };

    // 6. Perform the update in DynamoDB
    await dynamoDB
      .update({
        TableName: "HotelTable", // Name of your table from serverless.yml
        Key: bookingKey,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
      .promise();

    // 7. Return a success message
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "success",
        message: "Booking successfully updated",
        updatedBooking: data,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error updating booking", error }),
    };
  }
};
