
const { DynamoDBClient, DeleteItemCommand, GetItemCommand, QueryCommand, TransactWriteItemsCommand } = require("@aws-sdk/client-dynamodb");
const dynamoDb = require('../../config/dynamodb');
const { generateDateRange } = require('../../utils/generateDateRange');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { getRoomObjects } = require("../getRoomObjects");
const { createSuccessResponse, createErrorResponse } = require("../../utils/responses");
const { createTransactionItemsForRooms } = require("../../utils/dynamodbHelpers");
module.exports.handler = async (event, context) => {
  const bookingId = event.pathParameters.id;
  const checkInDate = event.pathParameters.date;

  //console.log("Booking ID:", bookingId);


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
      SK: { S: checkInDate, }
    },
  };



  try {
    const getCommand = new GetItemCommand(getParams);

    const getResult = await dynamoDb.send(getCommand);

    // console.log(getResult);
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

    if (daysDifference < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Bookings can only be canceled at least two days in advance' }),
      };
    }

    const booking = unmarshall(getResult.Item)
    //
    const dateList = generateDateRange(bookingDate, booking.EndDate)
    //console.log(booking);
    // console.log(dateList);
    //const roomObjects = await getRoomObjects(booking.StartDate, booking.EndDate);
    // console.log("rooms ", roomObjects);
    const transactItems = getTransactItems(booking, dateList)
    const trasactParams = {
        TransactItems: transactItems,
    };
    try {
      console.log("Woks?")
      await dynamoDb.send(new TransactWriteItemsCommand(trasactParams));
      return createSuccessResponse(`Booking ${bookingId} canceled successfully`)
   
    } catch (error) {
      console.log(error)
      return createErrorResponse(`Failed to delete ${bookingId}`)
    }



    //delete av bokning
    const params = {
      TableName: "HotelTable",
      Key: {
        PK: { S: `Booking#${bookingId}` },
        SK: { S: bookingDate }
      },
    };

    const command = new DeleteItemCommand(params);
    await dynamoDb.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Booking ${bookingId} canceled successfully` }),
    };
  } catch (error) {
    console.error('Error canceling booking:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not cancel booking' }),
    };
  }
};

const getTransactItems = (bookingData, dates) => {
  console.log("Booking Data:", bookingData);
  console.log("dates:", dates);
  const roomsPerDateList = createBookingDataForDates(bookingData, dates)

  // Array för alla transaktionsobjekt
  //const transactItems = [];
  const transactItems = createTransactionItemsForRooms(roomsPerDateList, false)

  // Skapa Update-objekt för varje datum i listan
  // dates.forEach(date => {
  //   const { Rooms } = bookingData;
  //   const updateExpression = [];
  //   const expressionAttributeValues = {};

  //   // Skapa update-uttryck och attributvärden för varje rumstyp
  //   Rooms.forEach(room => {
  //     const { Type, Quantity } = room;

  //     // Hämta index för rumstypen i Rooms-arrayen
  //     const typeIndex = roomTypeIndex(Type.toLowerCase());
  //     console.log("Room Type Index:", typeIndex);

  //     // Bygg update-uttrycket för att öka tillgängligheten för rumstypen
  //     updateExpression.push(`Rooms[${typeIndex}].Availability = Rooms[${typeIndex}].Availability + :${Type}`);
  //     expressionAttributeValues[`:${Type}`] = { N: Quantity.toString() };
  //   });

    // Lägg till ett nytt update-objekt för datumet
  //   transactItems.push({
  //     Update: {
  //       TableName: "HotelTable",
  //       Key: {
  //         PK: { S: 'ROOMS' },
  //         SK: { S: date },
  //       },
  //       UpdateExpression: 'SET ' + updateExpression.join(', '),
  //       ExpressionAttributeValues: expressionAttributeValues
  //     }
  //   });
  // });

  // Lägg till delete-objektet för att ta bort bokningen sist
  transactItems.push({
    Delete: {
      TableName: "HotelTable",
      Key: {
        PK: { S: `Booking#${bookingData.BookingID}` },
        SK: { S: bookingData.StartDate }
      }
    }
  });

  return transactItems;
};

// Move to own function
// function roomTypeIndex(type) {
//   const roomTypes = ["single", "double", "suit"]; // Rumtyper i samma ordning som i DynamoDB-dokumentet
//   return roomTypes.indexOf(type);
// }

function createBookingDataForDates(bookingData, dates) {
  return dates.map(date => ({
      date: date,
      rooms: bookingData.Rooms.map(room => ({
          price: room.Price,
          quantity: room.Quantity,
          type: room.Type
      }))
  }));
}




