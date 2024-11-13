const { DynamoDBClient, DeleteItemCommand, GetItemCommand, QueryCommand } = require("@aws-sdk/client-dynamodb");
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


