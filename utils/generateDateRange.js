module.exports.generateDateRange = (startDate, endDate) => {
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