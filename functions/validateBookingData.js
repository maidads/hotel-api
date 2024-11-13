
module.exports.validateBookingData = (data) => {
    // Kontrollera att alla obligatoriska fält finns
    const requiredFields = ["name", "email", "guests", "startDate", "endDate", "rooms"];
    for (let field of requiredFields) {
        if (!data.hasOwnProperty(field)) {
            return { valid: false, message: `Missing field: ${field}` };
        }
    }

    // Kontrollera att "rooms" är en array och innehåller minst ett objekt
    if (!Array.isArray(data.rooms) || data.rooms.length === 0) {
        return { valid: false, message: "Rooms must be a non-empty array" };
    }

    // Definiera de godkända rumstyperna
    const validRoomTypes = ["single", "double", "suit"];
    let hasValidRoom = false;

    // Kontrollera varje rum i rooms-arrayen
    for (let room of data.rooms) {
        // Kontrollera att varje rum har "type" och "quantity"
        if (!room.type || !room.hasOwnProperty("quantity")) {
            return { valid: false, message: "Each room must have a type and a quantity" };
        }

        // Kontrollera att room.type är en av de godkända typerna
        if (validRoomTypes.includes(room.type)) {
            hasValidRoom = true;
        }

        // Kontrollera att quantity är ett positivt heltal
        if (typeof room.quantity !== "number" || room.quantity <= 0) {
            return { valid: false, message: "Quantity must be a positive number" };
        }

    }

    // Kontrollera att åtminstone en av rummen har en giltig typ
    if (!hasValidRoom) {
        return { valid: false, message: "At least one room must be of type 'single', 'double', or 'suit'" };
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (startDate.getTime() === endDate.getTime()) {
        return { valid: false, message: "Start date and end date cannot be the same" };
    }

    // Kontrollera att endDate inte är före startDate
    if (endDate.getTime() < startDate.getTime()) {
        return { valid: false, message: "End date cannot be before start date" };
    }

    // Om allt är korrekt returnera true
    return { valid: true, message: "Booking data is valid" };
}

// Exempel på hur du använder funktionen


