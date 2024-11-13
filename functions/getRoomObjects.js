
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const dynamoDb = require('../config/dynamodb');
const { QueryCommand } = require("@aws-sdk/client-dynamodb");

module.exports.getRoomObjects = async (startDate, endDate) =>{
    const params = {
        TableName: 'HotelTable',
        KeyConditionExpression: 'PK = :roomKey AND SK BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: {
            ':roomKey': { S: 'ROOMS' },       
            ':startDate': { S: startDate },  
            ':endDate': { S: endDate }       
        },
    };
    const data = await dynamoDb.send(new QueryCommand(params));
    const rooms = data.Items.map(item => unmarshall(item));
    return rooms
}
