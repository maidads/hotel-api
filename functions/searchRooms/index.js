const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../../config/dynamodb');
const { QueryCommand } = require("@aws-sdk/client-dynamodb");



module.exports.handler = async (event, context) => {
    const { guests, startDate, endDate } = event.queryStringParameters || {};
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
            ':roomKey': { S: 'ROOMS' },       
            ':startDate': { S: startDate },  
            ':endDate': { S: endDate }       
        },
    };

    try {
        const data = await dynamoDb.send(new QueryCommand(params));
        const rooms = data.Items.map(item => unmarshall(item));
        // If the days isn't present in db, it is nothing booked that day. Add info for unbooked rooms
        if (rooms.length === 0 ){
            let newRooms = {
                Rooms: [
                    {"Type": "Single", "Beds": 1, "Price": 1000, "Availability": 2, "Bookings": [] },
                    { "Type": "Double", "Beds": 2, "Price": 1500, "Availability": 15, "Bookings": [] },
                    { "Type": "Suit", "Beds": 2, "Price": 1500, "Availability": 3, "Bookings": [] }
                  ]
            }
            rooms.push(newRooms)
        }
     
        const lowestAvailabilityByRoomType = {};
        rooms.forEach(day => {
            day.Rooms.forEach(roomType => {
                const type = roomType.Type;
                if (!lowestAvailabilityByRoomType[type]) {
                    lowestAvailabilityByRoomType[type] = {
                        beds: roomType.Beds,
                        pricePerNight: roomType.Price,
                        availability: roomType.Availability 
                    };
                } else {
                   
                    if (lowestAvailabilityByRoomType[type].Availability > roomType.Availability) {
                        lowestAvailabilityByRoomType[type].Availability = roomType.Availability;
                    }
                }
            });
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Rooms retrieved successfully.',
                rooms: lowestAvailabilityByRoomType,
            }),
        };
    } catch (error) {
        console.error('Error querying rooms:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not retrieve rooms' }),
        };
    }


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