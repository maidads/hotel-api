module.exports.handler = async (event, context) => {
    const bookingId = event.pathParameters.id;
    
    console.log(bookingId)
}