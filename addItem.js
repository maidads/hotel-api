const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb"); // Importera nödvändiga delar från nya SDK:n

const dynamoDb = require('./config/dynamodb'); 

module.exports.handler = async (event) => {
  const { PK, SK } = JSON.parse(event.body);  // Läser PK, SK och övriga data från request body

  if (!PK || !SK) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'PK and SK are required.' }),
    };
  }

  const params = {
    TableName: "HotelTable",
    Item: {
        PK: { S: PK },  // Använd rätt datatyp (String) för PK och SK
        SK: { S: SK },  // Använd rätt datatyp (String) för SK

    },
  };

  try {
    // Skapa ett PutItemCommand för att lägga till objektet i DynamoDB
    const command = new PutItemCommand(params);
    await dynamoDb.send(command);  // Skicka kommandot till DynamoDB

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Item added successfully', item: params.Item }),
    };
  } catch (error) {
    console.error('Error adding item:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not add item' }),
    };
  }
};