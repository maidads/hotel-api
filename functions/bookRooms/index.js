const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../../config/dynamodb');
const { TransactWriteItemsCommand, BatchWriteItemCommand, PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { getRoomObjects } = require('../getRoomObjects');
const crypto = require('crypto');
const {validateBookingData} = require('../validateBookingData');
const {getBodyJson} = require('../getBodyJson');
const { generateDateRange} =require('../../utils/generateDateRange')


module.exports.handler = async (event, context) => {

    const bookingData = getBodyJson(event);

    if (bookingData.error) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                message: bookingData.error
            }),
        };
    }
    const validData = validateBookingData(bookingData);
    if (!validData.valid){
        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                message: validData.message
            }),
        };
    }

    //Hämta alla rooms
    const rooms = await getRoomObjects(bookingData.startDate, bookingData.endDate);

    // Kolla om det är några dagara som behöver skapas
    const dateList = generateDateRange(bookingData.startDate, bookingData.endDate);

    if (dateList.length != rooms.length) {
        // Om det är det skapa dagarna i databasen
        const missingDates = dateList.filter(date =>
            !rooms.some(room => room.SK === date)
        );
        await createRoomObjectsInDb(missingDates)
    }
    const bookingsPerDate = getBookingDataForEachDate(dateList, bookingData)

    const bookingOBJ = getBookingOBJ(bookingData, rooms[0])
    const result = (await bookRooms(bookingsPerDate, bookingOBJ));
    if (!result.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                success: false,
                message: "Not enough rooms"
            }),
        };
    } else {
        const nights = dateList.length-1
        const total = getTotalPrice(bookingOBJ.Rooms, nights) 
        console.log("Total", total);
        const bookingDetails = {
            bookingnr: bookingOBJ.BookingID,
            guest: bookingOBJ.NumberOfGuests,
            rooms: bookingOBJ.Rooms,
            checkInDate: bookingOBJ.StartDate,
            checkOutDate: bookingOBJ.EndDate,
            name: bookingOBJ.Name,
            totalPrice: total
        }
 //       console.log("Now is scan!")
        //       await scanAllItems();
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                details: bookingDetails
            }),
        };
    }
}

const getBookingDataForEachDate = (dates, bookingData) => {
    const bookingForEachDate = []
    dates.forEach(date => {
        let booking = {
            date: date,
            rooms: bookingData.rooms
        }
        bookingForEachDate.push(booking)
    })
    return bookingForEachDate;
}

// function generateDateRange(startDate, endDate) {
//     const dateArray = [];
//     let currentDate = new Date(startDate);
//     const end = new Date(endDate);

//     // Loopar genom varje datum i intervallet
//     while (currentDate <= end) {
//         // Skapa sträng i formatet YYYY-MM-DD
//         const dateString = currentDate.toISOString().split('T')[0];
//         dateArray.push(dateString);

//         // Lägg till en dag
//         currentDate.setDate(currentDate.getDate() + 1);
//     }
//     return dateArray;
// }

const createRoomObjectsInDb = async (dates) => {
    const roomObjects = []
    dates.forEach(date => {
        roomObjects.push(getNewRoomObjectForDate(date))
    });
    const putReq = roomObjects.map(room => ({
        PutRequest: {
            Item: marshall(room),
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)', // Kontrollera om PK och SK inte finns
        }
    }))
    const params = {
        RequestItems: {
            'HotelTable': putReq
        }
    }
    try {
        const data = await dynamoDb.send(new BatchWriteItemCommand(params));
    } catch (error) {
        console.error('Batch write failed:', error)
    }
}

const bookRooms = async (bookingData, bookingOBJ) => {

    const transactItems = bookingData.map(booking => {
        //  console.log("Booking", booking);
        const { date, rooms } = booking;
        const updateExpression = [];
        const expressionAttributeValues = {};

        rooms.forEach(room => {
            const { type, quantity } = room;

            // Lägg till uttryck för varje rumstyp
            const typeIndex = roomTypeIndex(type);  // Får index för rumstypen i Rooms-arrayen

            updateExpression.push(`Rooms[${typeIndex}].Availability = Rooms[${typeIndex}].Availability - :${type}`);
            expressionAttributeValues[`:${type}`] = { N: quantity.toString() };
        });

        const conditionExpressionParts = rooms.map(room => {
            console.log(room);
            const typeIndex = roomTypeIndex(room.type);

            return `Rooms[${typeIndex}].Availability >= :${room.type}`;
        });
        const conditionExpression = conditionExpressionParts.join(' AND ');

        const updateParams = {
            Update: {
                TableName: "HotelTable",
                Key: {
                    PK: { S: 'ROOMS' },
                    SK: { S: date },
                },
                UpdateExpression: 'SET ' + updateExpression.join(', '),
                ExpressionAttributeValues: expressionAttributeValues,
                ConditionExpression: conditionExpression,
            }
        };


        return updateParams;
    });
    const bookingParam = getPutParamsForBooking(bookingOBJ)
    transactItems.push(bookingParam);

    const params = {
        TransactItems: transactItems,
    };

    try {
        await dynamoDb.send(new TransactWriteItemsCommand(params));
        return { success: true };
    } catch (error) {
        return { success: false, error: error };
    }
};


function roomTypeIndex(type) {
    const roomTypes = ["single", "double", "suit"]; // Rumtyper i samma ordning som i DynamoDB-dokumentet
    return roomTypes.indexOf(type);
}


const getNewRoomObjectForDate = (date) => {
    return newRoom = {
        "PK": "ROOMS",
        "SK": date,
        "Rooms": [
            { "Type": "Single", "Beds": 1, "Price": 1000, "Availability": 7, "Bookings": [] },
            { "Type": "Double", "Beds": 2, "Price": 1500, "Availability": 10, "Bookings": [] },
            { "Type": "Suit", "Beds": 2, "Price": 1800, "Availability": 3, "Bookings": [] }
        ]
    }
}

const getBookingOBJ = (bookingData, room) => {
    console.log(room)
    if (room === undefined){
        room = getNewRoomObjectForDate("dosent matter")// just to get the room types
    }
    var prices = {
    }
    room.Rooms.forEach(type => {
        prices[type.Type.toLowerCase()] = type.Price
    })

    const bookedRooms = []
    bookingData.rooms.forEach(type => {

        const bookedType = {
            Type: capitalize(type.type),
            Quantity: type.quantity,
            Price: prices[type.type]
        }
        bookedRooms.push(bookedType);
    })
    const id = crypto.randomUUID();
    const bookingOBJ = {
        "PK": `Booking#${id}`,
        "SK": bookingData.startDate,
        BookingID: id,
        Name: bookingData.name,
        Email: bookingData.email,
        NumberOfGuests: bookingData.guests,
        StartDate: bookingData.startDate,
        EndDate: bookingData.endDate,
        Rooms: bookedRooms
    }
    return bookingOBJ;

}
function capitalize(str) {

    return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

const getPutParamsForBooking = (bookingOBJ) => {
    const bookingParam = {
        Put: {
            TableName: "HotelTable",
            Item: marshall(bookingOBJ)
        }
    };
    return bookingParam
}

// const scanAllItems = async () => {
//     const params = {
//         TableName: 'HotelTable', // Byt ut med ditt tabellnamn
//     };

//     try {
//         const data = await dynamoDb.send(new ScanCommand(params));

//         // Om vi har data, avmarschallera och logga till konsolen
//         if (data.Items) {
//             data.Items.forEach(item => {
//                 const unmarshalledItem = unmarshall(item);  // Omvandla från DynamoDB format till ett vanligt JS-objekt
//                 console.log(unmarshalledItem);
//             });
//         } else {
//            console.log('No items found');
//         }
//     } catch (error) {
//         console.error('Error scanning items:', error);
//     }
// };

const getTotalPrice = (rooms, nights) => {
    var total = 0
    rooms.forEach(room => {
        //       console.log(room)
        total += (room.Quantity * room.Price)
    })
    return (total * nights)
}