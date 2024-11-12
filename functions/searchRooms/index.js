const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../../config/dynamodb');
const { QueryCommand } = require("@aws-sdk/client-dynamodb");
const { getRoomObjects } = require('../getRoomObjects');




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


    // const params = {
    //     TableName: 'HotelTable',
    //     KeyConditionExpression: 'PK = :roomKey AND SK BETWEEN :startDate AND :endDate',
    //     ExpressionAttributeValues: {
    //         ':roomKey': { S: 'ROOMS' },       
    //         ':startDate': { S: startDate },  
    //         ':endDate': { S: endDate }       
    //     },
    // };

    try {
        // const data = await dynamoDb.send(new QueryCommand(params));
        // const rooms = data.Items.map(item => unmarshall(item));
        const rooms = await getRoomObjects(startDate, endDate);
        // If the days isn't present in db, it is nothing booked that day. Add info for unbooked rooms
        if (rooms.length === 0 ){
            let newRooms = {
                Rooms: [
                    {"Type": "Single", "Beds": 1, "Price": 1000, "Availability": 2, "Bookings": [] },
                    { "Type": "Double", "Beds": 2, "Price": 1500, "Availability": 15, "Bookings": [] },
                    { "Type": "Suit", "Beds": 2, "Price": 1800, "Availability": 3, "Bookings": [] }
                  ]
            }
            rooms.push(newRooms)
        }
     
        const lowestAvailabilityByRoomType = getLowestAvailabilityByRoomType(rooms);

        const beds = getNrOfBedsFree(lowestAvailabilityByRoomType);
        if (guests > beds){

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Not enough rooms available',
                    rooms: lowestAvailabilityByRoomType,
                }),
            };
        }

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

const getLowestAvailabilityByRoomType = (rooms) => {
    const lowestAvailabilityByRoomType = {};
    rooms.forEach(day => {
        day.Rooms.forEach(roomType => {
            const type = roomType.Type;
            console.log(type.Availability)
            if (!lowestAvailabilityByRoomType[type]) {
                lowestAvailabilityByRoomType[type] = {
                    beds: roomType.Beds,
                    pricePerNight: roomType.Price,
                    availability: roomType.Availability 
                };
            } else {
               
                if (lowestAvailabilityByRoomType[type].availability > roomType.Availability) {
                    lowestAvailabilityByRoomType[type].availability = roomType.Availability;
                }
            }
        });
    });
    return lowestAvailabilityByRoomType;
}

const getNrOfBedsFree = (availability) => {
    var beds = 0
    Object.keys(availability).forEach(roomType => {
        const room = availability[roomType];
        beds += (room.beds * room.availability)
    })
    return beds
}

// module.exports.getRoomObjects = async (startDate, endDate) =>{
//     const params = {
//         TableName: 'HotelTable',
//         KeyConditionExpression: 'PK = :roomKey AND SK BETWEEN :startDate AND :endDate',
//         ExpressionAttributeValues: {
//             ':roomKey': { S: 'ROOMS' },       
//             ':startDate': { S: startDate },  
//             ':endDate': { S: endDate }       
//         },
//     };
//     const data = await dynamoDb.send(new QueryCommand(params));
//     const rooms = data.Items.map(item => unmarshall(item));
//     return rooms
// }
