const {marshall, unmarshall} = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../../config/dynamodb');
const { QueryCommand } = require("@aws-sdk/client-dynamodb");



module.exports.handler = async (event, context) => {
    const {guests, startDate, endDate} = event.queryStringParameters || {};
    if (!guests || !startDate || !endDate) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Missing required query parameters: guests, startDate, and endDate are all required.',
          }),
        };
      }

    
      const params = {
        TableName: 'HotelTable',
        KeyConditionExpression: 'PK = :roomKey AND SK BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: {
          ':roomKey': { S: 'ROOMS' },       // Sätt din partition key till "ROOM"
          ':startDate': { S: startDate },  // Början av datumintervallet
          ':endDate': { S: endDate }       // Slutet av datumintervallet
        },
      };

      try {
        const data = await dynamoDb.send(new QueryCommand(params));
        const rooms = data.Items.map(item => unmarshall(item));
        const getLowestAvailablityOfRoomTypes = {}
        rooms.forEach(day => {
            day.Rooms.forEach(roomType => {
                let type = roomType.Type
                if (getLowestAvailablityOfRoomTypes[type] === undefined || getLowestAvailablityOfRoomTypes[type] > roomType.Availability){
                    getLowestAvailablityOfRoomTypes[type] = roomType.Availability
                }
            })
        });
        
        console.log(getLowestAvailablityOfRoomTypes)

        // Nu vet vi vilka rum som det finns minst av i perioden typ kanske blir problem om det saknas datum
        

        // Collected all room lists

        //check minimum 

        //console.log(generateDateRange(startDate, endDate))
        // Is our list complete

        



        return {
          statusCode: 200,
          body: JSON.stringify({
            message: 'Rooms retrieved successfully.',
            rooms: rooms,
          }),
        };
      } catch (error) {
        console.error('Error querying rooms:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Could not retrieve rooms' }),
        };
      }
    

    console.log(guests, startDate, endDate)
}

function generateDateRange(startDate, endDate) {
    const dateArray = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    // Loopar genom varje datum i intervallet
    while (currentDate <= end) {
        // Skapa sträng i formatet YYYY-MM-DD
        const dateString = currentDate.toISOString().split('T')[0];
        dateArray.push(dateString);

        // Lägg till en dag
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
}