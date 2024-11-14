const { unmarshall } = require("@aws-sdk/util-dynamodb");

function extractBookingData(item) {
    const itemData = unmarshall(item);

    console.log("Unmarshalled item data:", itemData);

    const roomTypes = (itemData.Rooms || []).map(room => room.Type || room.type);

    return {
        bookingNumber: itemData.PK.replace('Booking#', ''),
        checkInDate: itemData.StartDate,
        checkOutDate: itemData.EndDate,
        numberOfGuests: itemData.NumberOfGuests,
        numberOfRooms: itemData.Rooms ? itemData.Rooms.length : 0,
        bookerName: itemData.Name,
        roomTypes: roomTypes,
    };
}


module.exports = {
    extractBookingData,
};
