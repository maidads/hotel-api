const { getRoomObjects } = require('./getRoomObjects');
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require('../config/dynamodb');

module.exports.handler = async (event) => {
  try {
    // Parse input data
    const data = JSON.parse(event.body);
    console.log("Request data:", data);

    // Validate input
    if (
      !data.bookingId ||
      !data.checkInDate ||
      !data.checkOutDate ||
      !data.roomTypes ||
      !data.numberOfGuests
    ) {
      console.error("Validation failed: Missing required fields");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // Check total capacity
    const totalCapacity = data.roomTypes.reduce((sum, room) => {
      if (room.type === "Single") return sum + room.count * 1;
      if (room.type === "Double") return sum + room.count * 2;
      if (room.type === "Suite") return sum + room.count * 3;
      return sum;
    }, 0);

    console.log("Total capacity:", totalCapacity);

    if (totalCapacity < data.numberOfGuests) {
      console.error("Capacity check failed");
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Number of rooms does not match the number of guests",
        }),
      };
    }

    // Check room availability
    const rooms = await getRoomObjects(data.checkInDate, data.checkOutDate);
    console.log("Rooms fetched:", rooms);

    const isAvailable = checkAvailability(rooms, data.roomTypes);
    if (!isAvailable) {
      console.error("Room availability check failed");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Selected rooms are not available" }),
      };
    }

    // Define keys for updating booking
    const bookingKey = {
      PK: `BOOKING#${data.bookingId}`,
      SK: "METADATA",
    };
    console.log("Booking Key:", bookingKey);

    // Update booking in DynamoDB
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

    console.log("Expression Attribute Values:", expressionAttributeValues);

    await dynamoDb.send(
      new UpdateCommand({
        TableName: "HotelTable",
        Key: bookingKey,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    console.log("Booking successfully updated");
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "success",
        message: "Booking successfully updated",
        updatedBooking: data,
      }),
    };
  } catch (error) {
    console.error("Error modifying booking:", error); 
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error updating booking",
        error: error.message || "Unknown error",
      }),
    };
  }
};

// Helper function to check room availability
function checkAvailability(rooms, requestedRoomTypes) {
  console.log("Checking availability for rooms:", rooms);
  console.log("Requested room types:", requestedRoomTypes);

  for (const requested of requestedRoomTypes) {
    const room = rooms.find((r) => {
      console.log("Comparing room type:", r.Rooms, "with requested type:", requested.type);
      return r.Rooms.some((roomType) => roomType.Type === requested.type);
    });

    if (!room) {
      console.warn("No room found for requested type:", requested.type);
      return false;
    }

    const availableRoom = room.Rooms.find((roomType) => roomType.Type === requested.type);
    if (availableRoom.Availability < requested.count) {
      console.warn(
        `Room type ${requested.type} does not have enough availability. Needed: ${requested.count}, Available: ${availableRoom.Availability}`
      );
      return false;
    }
  }

  return true;
}
