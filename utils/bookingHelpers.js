const { unmarshall } = require("@aws-sdk/util-dynamodb");

function extractBookingData(item) {
    const itemData = unmarshall(item);

    const roomTypes = (itemData.Rooms || []).map(room => room.Type);

    return {
        bookingNumber: itemData.BookingID,
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
