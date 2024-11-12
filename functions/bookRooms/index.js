const { marshall } = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../../config/dynamodb');
const { TransactWriteItemsCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const { getRoomObjects } = require('../getRoomObjects')
const crypto = require('crypto');


module.exports.handler = async (event, context) => {
    const body = event.body;
    const bookingData = JSON.parse(body);
    if (!bookingData) {
        console.log("Send No booking data")
    }
    console.log(bookingData)
    //Hämta alla rooms
    const rooms = await getRoomObjects(bookingData.startDate, bookingData.endDate);
    console.log(rooms)   


    // Kolla om det är några dagara som behöver skapas
    const dateList = generateDateRange(bookingData.startDate, bookingData.endDate);

    if (dateList.length != rooms.length) {
        // Om det är det skapa dagarna i databasen
        const missingDates = dateList.filter(date =>
            !rooms.some(room => room.SK === date)
        );
        await createRoomObjectsInDb(missingDates)
        // Skapa i db

        //console.log("Missing", missingDates);
    }
    const bookingsPerDate = getBookingDataForEachDate(dateList, bookingData)
    console.log(bookingsPerDate);

    const success = (await bookRooms(bookingsPerDate));
    if (!success){
        console.log("Unable to book")
    } else {
        var prices = {

        }
        rooms[0].Rooms.forEach(type => {
            console.log("This is the type", type)
            console.log("type.Type", type.Type)
            console.log("type.Price", type.Price)
            prices[type.Type.toLowerCase()] = type.Price
            // if(type.type = "Singel"){
            //     singelPrice = type.Price
            // } else if (type.type = "Double"){
            //     dubblePrice = type.Price
            // } else if (type.type = "Suit"){
            //     suitPrice = type.Price
            // }
        })
      //  console.log(singelPrice, dubblePrice, suitPrice)


        const bookedRooms = []
        bookingData.rooms.forEach(type => {

            const bookedType = {
                type: type.type,
                quantity: type.quantity,
                pricePerRoom: prices[type.type]
            }
            bookedRooms.push(bookedType);
        })
        const id = crypto.randomUUID();
        const bookingOBJ = {
            "PK" : `Booking#${id}`,
            "SK" : bookingData.startDate,
            id: id,
            name: bookingData.name,
            email: bookingData.email,
            guests: bookingData.guests,
            startDate: bookingData.startDate,
            endDate: bookingData.endDate,
            rooms: bookedRooms
        }

        console.log(bookingOBJ);
        // Add Booking to DB
        // get uniqueID

        // Create Respones
    }



    // Skapa alla uppdateringar som ska göras som en transaction




    // Om den lycaks skicka tillbaka bekräftelse
    // Annars skicka tillbaka ett nekande 




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
        console.log('Succes', data)
    } catch (error) {
        console.error('Batch write failed:', error)
    }


    // console.log(roomObjects)


}

const bookRooms = async (bookingData) => {
    const transactItems = bookingData.map(booking => {
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

// Hjälpfunktion för att mappa rumstyp till index i arrayen
function roomTypeIndex(type) {
    const roomTypes = ["single", "double", "suit"]; // Rumtyper i samma ordning som i DynamoDB-dokumentet
    return roomTypes.indexOf(type);
}

// const bookRooms = async (bookingData) => {


    
//     const transactItems = bookingData.map(booking => {
//         // Skapa ett UpdateExpression för alla rumstyper på ett visst datum
//         const updateExpression = [];
//         const expressionAttributeValues = {};
        
//         if (booking.singel > 0) {
//             updateExpression.push('Rooms[0].Availability = Rooms[0].Availability - :singel');
//             expressionAttributeValues[':singel'] = { N: singel.toString() };
//         }
//         if (double > 0) {
//             updateExpression.push('Rooms[1].Availability = Rooms[1].Availability - :double');
//             expressionAttributeValues[':double'] = { N: double.toString() };
//         }
//         if (suit > 0) {
//             updateExpression.push('Rooms[2].Availability = Rooms[2].Availability - :suit');
//             expressionAttributeValues[':suit'] = { N: suit.toString() };
//         }

//         const updateParams = {
//             Update: {
//                 TableName: "HotelTable",
//                 Key: {
//                     PK: { S: 'ROOMS' },
//                     SK: { S: date },
//                 },
//                 UpdateExpression: 'SET ' + updateExpression.join(', '),
//                 ExpressionAttributeValues: expressionAttributeValues,
//                 ConditionExpression: 'Rooms[0].Availability >= :singel AND Rooms[1].Availability >= :double AND Rooms[2].Availability >= :suit'
//             }
//         };
//         return updateParams;
//     });
//     // const transactItems = [];
//     // bookingData.forEach(booking => {
//     //     const { date, rooms } = booking;
//     //     rooms.forEach(room => {
//     //         const { type, quantity } = room;
//     //         const updateParams = {
//     //             Update: {
//     //                 TableName: "HotelTable",
//     //                 Key: {
//     //                     PK: { S: 'ROOMS' },
//     //                     SK: { S: date },
//     //                 },
//     //                 UpdateExpression: 'SET Rooms[' +
//     //                     roomTypeIndex(type) + 
//     //                     '].Availability = Rooms[' + 
//     //                     roomTypeIndex(type) + 
//     //                     '].Availability - :quantity',
//     //                 ExpressionAttributeValues: {
//     //                     ':quantity': { N: quantity.toString() },
//     //                 },
//     //                 ConditionExpression: 'Rooms[' + 
//     //                     roomTypeIndex(type) + 
//     //                     '].Availability >= :quantity',  // Kontrollerar att tillräckligt med rum finns
//     //             }
//     //         };
//     //         transactItems.push(updateParams);
//     //     });
//     // });
//     const params = {
//         TransactItems: transactItems
//     };
//     try {
//         await dynamoDb.send(new TransactWriteItemsCommand(params))

//         return { success: true }
//     } catch (error) {
//         return { success: false, error: error }
//     }

//     //console.log(transactItems);
// }
// function roomTypeIndex(type) {
//     const roomTypes = ["single", "double", "suit"]; // Antag att dessa är de rumstyper du har
//     return roomTypes.indexOf(type);
// }

const getNewRoomObjectForDate = (date) => {
    return newRoom = {
        "PK": "ROOMS",
        "SK": date,
        "Rooms": [
            { "Type": "Single", "Beds": 1, "Price": 1000, "Availability": 7, "Bookings": [] },
            { "Type": "Double", "Beds": 2, "Price": 1500, "Availability": 10, "Bookings": [] },
            { "Type": "Suit", "Beds": 2, "Price": 1500, "Availability": 3, "Bookings": [] }
        ]
    }
}