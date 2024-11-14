function getBookingIds(bookings) {
    const uniqueIds = new Set();

    bookings.forEach(booking => {
        const bookingId = booking.bookingId;
        uniqueIds.add(bookingId);
    });

    return Array.from(uniqueIds);
}

