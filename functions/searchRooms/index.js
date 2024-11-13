const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../../config/dynamodb');
const { QueryCommand } = require("@aws-sdk/client-dynamodb");
const { getRoomObjects } = require('../getRoomObjects');
const { createErrorResponse, createSuccessResponse } = require('../../utils/responses');

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

    try {

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
            return createErrorResponse("Not enough rooms available.");
        }

            return createSuccessResponse(lowestAvailabilityByRoomType);

    } catch (error) {
        console.error('Error querying rooms:', error);
        return createErrorResponse("Error querying rooms")
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

