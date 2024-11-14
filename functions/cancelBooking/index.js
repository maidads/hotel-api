const { DynamoDBClient, DeleteItemCommand, GetItemCommand, UpdateItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
const dynamoDb = require('../../config/dynamodb');

module.exports.handler = async (event, context) => {
  const bookingId = event.pathParameters.id;
  const checkInDate = event.pathParameters.date;
  
  console.log("Booking ID:", bookingId);

  if (!bookingId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Booking ID is required' }),
    };
  }

  const getParams = {
    TableName: "HotelTable",
    Key: {
      PK: { S: `Booking#${bookingId}` },
      SK: {S: checkInDate,}
    },
  };

  try {
    const getCommand = new GetItemCommand(getParams);
    const getResult = await dynamoDb.send(getCommand);
    console.log(getResult);

    if (!getResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Booking not found' }),
      };
    }

    const bookingDate = getResult.Item.StartDate.S;
    const bookingDateObj = new Date(bookingDate);
    const currentDate = new Date();
    const timeDifference = bookingDateObj.getTime() - currentDate.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

    const bookingRooms = getResult.Item.Rooms.L;

    if (daysDifference < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Bookings can only be canceled at least two days in advance' }),
      };
    }



  //delete av bokning
  const params = {
    TableName: "HotelTable",
    Key: {
      PK: { S: `Booking#${bookingId}` },
      SK: {S: bookingDate}
    },
  };

    const command = new DeleteItemCommand(params);
    await dynamoDb.send(command);



    for (let room of bookingRooms) {
      const roomType = room.M.Type.S.toLowerCase();
      const quantity = room.M.Quantity ? parseInt(room.M.Quantity.N, 10) : 0;

      if (!quantity || isNaN(quantity)) {
        console.error(`Room type ${roomType} is missing a valid Quantity value.`);
        continue;
      }

      console.log(`Before update: ${roomType} availability:`, room.M.Availability);
    
      const updateParams = {
        TableName: "HotelTable",
        Key: {
          PK: { S: 'ROOMS' },
          SK: { S: checkInDate },
        },
        UpdateExpression: `SET Rooms[${roomTypeIndex(roomType)}].Availability = Rooms[${roomTypeIndex(roomType)}].Availability + :quantity`,
        ExpressionAttributeValues: {
          ":quantity": { N: quantity.toString() },
        },
        ConditionExpression: 'attribute_exists(PK)', // Kontrollera att rumsobjektet existerar
      };
      console.log("Before update, availability:", roomType, getResult.Item.Rooms[roomTypeIndex(roomType)].Availability);

      await dynamoDb.send(new UpdateItemCommand(updateParams));

      console.log("After update, availability:", roomType, getResult.Item.Rooms[roomTypeIndex(roomType)].Availability);
    } 
  

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Booking ${bookingId} canceled successfully and room are now availabel for booking` }),
    };
  } catch (error) {
    console.error('Error canceling booking:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not cancel booking' }),
    };
  }
}; 


function roomTypeIndex(type) {
  const roomTypes = ["single", "double", "suit"];
  return roomTypes.indexOf(type);
}





