const dynamoDb = require('./config/dynamodb'); // Importera dynamoDb-konfigurationen
const { ScanCommand } = require("@aws-sdk/client-dynamodb");  // Importera ScanCommand

module.exports.hello = async (event) => {
  const params = {
    TableName: "HotelTable",
  };

  try {
    const command = new ScanCommand(params);  // Skapa ett kommando
    const result = await dynamoDb.send(command);  // Skicka kommandot till DynamoDB
    
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'DynamoDB response: ',
        data: result.Items,  // result.Items innehåller de hämtade objekten från DynamoDB
      }),
    };
    return response;
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error retrieving from DynamoDB' }),
    };
  }
};