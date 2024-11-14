const { unmarshall } = require("@aws-sdk/util-dynamodb");

function extractBookingData(item) {
    const itemData = unmarshall(item);

    console.log("Unmarshalled item data:", itemData);

    const roomTypes = (itemData.rooms || []).map(room => room.type || room.type);

    return {
        bookingNumber: itemData.PK.replace('Booking#', ''),
        checkInDate: itemData.startDate,
        checkOutDate: itemData.endDate,
        numberOfGuests: itemData.numberOfGuests,
        numberOfRooms: itemData.rooms ? itemData.rooms.length : 0,
        bookerName: itemData.name,
        roomTypes: roomTypes,
    };
}


module.exports = {
    extractBookingData,
};
