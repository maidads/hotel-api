const { getRoomObjects } = require('./getRoomObjects');
const {
  DeleteCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require('../config/dynamodb');

module.exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    console.log("Request data:", data);

    if (
      !data.bookingId ||
      !data.checkInDate ||
      !data.checkOutDate ||
      !data.roomTypes ||
      !data.numberOfGuests ||
      !data.originalCheckInDate
    ) {
      console.error("Validation failed: Missing required fields");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    const totalCapacity = data.roomTypes.reduce((sum, room) => {
      const roomType = room.type || room.type;
      if (roomType === "single") return sum + room.count * 1;
      if (roomType === "double") return sum + room.count * 2;
      if (roomType === "suite") return sum + room.count * 3;
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

    const bookingKey = {
      PK: `Booking#${data.bookingId}`,
      SK: data.originalCheckInDate,
    };
    console.log("Booking Key:", bookingKey);

    await dynamoDb.send(
      new DeleteCommand({
        TableName: "HotelTable",
        Key: bookingKey,
      })
    );

    const newItem = {
      PK: `Booking#${data.bookingId}`,
      SK: data.checkInDate,
      bookingID: data.bookingId,
      name: data.guestName,
      startDate: data.checkInDate,
      endDate: data.checkOutDate,
      rooms: data.roomTypes,
      numberOfGuests: data.numberOfGuests,
    };

    await dynamoDb.send(
      new PutCommand({
        TableName: "HotelTable",
        Item: newItem,
      })
    );

    console.log("Booking successfully updated");
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "success",
        message: "Booking successfully updated",
        updatedBooking: newItem,
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

function checkAvailability(rooms, requestedRoomTypes) {
  for (const requested of requestedRoomTypes) {
    const requestedType = requested.type || requested.type;
    const room = rooms.find((r) =>
      r.rooms.some((roomType) => (roomType.type || roomType.type) === requestedType)
    );

    if (!room) {
      console.warn("No room found for requested type:", requestedType);
      return false;
    }

    const availableRoom = room.rooms.find(
      (roomType) => (roomType.type || roomType.type) === requestedType
    );
    if (availableRoom.Availability < requested.count) {
      console.warn(
        `Room type ${requestedType} does not have enough availability. Needed: ${requested.count}, Available: ${availableRoom.Availability}`
      );
      return false;
    }
  }

  return true;
}


