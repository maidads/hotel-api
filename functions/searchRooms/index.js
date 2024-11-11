module.exports.handler = async (event, context) => {
    const {guests, startDate, endDate} = event.queryStringParameters || {};
    console.log(guests, startDate, endDate)
}