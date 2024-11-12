const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../../config/dynamodb');
const { TransactWriteItemsCommand, BatchWriteItemCommand, PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { getRoomObjects } = require('../getRoomObjects')
const crypto = require('crypto');


module.exports.handler = async (event, context) => {
    const body = event.body;
    const bookingData = JSON.parse(body);
    if (!bookingData) {
        console.log("Send No booking data")
    }
    // console.log(bookingData)
    //Hämta alla rooms
    const rooms = await getRoomObjects(bookingData.startDate, bookingData.endDate);
    //console.log(rooms)   


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

    const result = (await bookRooms(bookingsPerDate));
    if (!result.success) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: false,
                message: "Not enough rooms"
            }),
        };
    } else {
        var prices = {

        }
        rooms[0].Rooms.forEach(type => {
            prices[type.Type.toLowerCase()] = type.Price
        })



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

        //  console.log(bookingOBJ);
        const savedBooking = await saveBookingToDb(bookingOBJ);
        if (savedBooking.success) {
            const total = getTotalPrice(bookingOBJ.Rooms)
            const bookingDetails = {
                bookingnr: bookingOBJ.BookingID,
                guest: bookingOBJ.NumberOfGuests,
                rooms: bookingOBJ.Rooms,
                checkInDate: bookingOBJ.StartDate,
                checkOutDate: bookingOBJ.EndDate,
                name: bookingOBJ.Name,
                totalPrice: total
            }
            //      scanAllItems();
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    details: bookingDetails
                }),
            };
        } else {
            console.log(savedBooking)
        }
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
            // console.log('Succes', data)
        } catch (error) {
            console.error('Batch write failed:', error)
        }


        // console.log(roomObjects)


    }

    const bookRooms = async (bookingData) => {

        const transactItems = bookingData.map(booking => {
            console.log("Booking", booking);
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
            //  console.log("UprateParams ->", updateParams)

            return updateParams;
        });
        transactItems.forEach(item => {
            console.log(item)
        })

        const params = {
            TransactItems: transactItems,
        };

        try {
            //console.log(params)
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

    const saveBookingToDb = async (bookingOBJ) => {
        const params = {
            TableName: 'HotelTable',
            Item: marshall(bookingOBJ)
        };
        try {
            const data = await dynamoDb.send(new PutItemCommand(params));
            return { success: true };
        } catch (error) {
            return { success: false, error: error };
        }
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
    //      //           console.log(unmarshalledItem);
    //             });
    //         } else {
    //    //        console.log('No items found');
    //         }
    //     } catch (error) {
    //         console.error('Error scanning items:', error);
    //     }
    // };

    const getTotalPrice = (rooms) => {
        var total = 0
        rooms.forEach(room => {
            //       console.log(room)
            total += (room.quantity * room.pricePerRoom)
        })
        return total
    }