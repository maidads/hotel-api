# Hotel Booking API

This API manages bookings and room availability for a hotel. It is built with a serverless architecture on AWS and uses DynamoDB to store booking data.

## Base URL

```plaintext
https://e7kbb8tatb.execute-api.eu-north-1.amazonaws.com/dev
```

## End Points
### 1. Search Available Rooms

- **Endpoint**: `/search-rooms`
- **Method**: `GET`
- **Description**: Retrieves available rooms based on the number of guests and the specified check-in and check-out date range.

#### Query Parameters

| Parameter | Type    | Description                                     |
|-----------|---------|-------------------------------------------------|
| `guests`  | Integer | Number of guests                                |
| `startDate` | String | Check-in date in `yyyy-mm-dd` format            |
| `endDate`   | String | Check-out date in `yyyy-mm-dd` format           |

#### Example Request
```plaintext
GET /search-rooms?guests=2&startDate=2024-11-01&endDate=2024-11-02
```

Response: Message is either "Rooms retrieved successfully.” Or  "message": "Not enough rooms available”

Followed buy a specifikations of how many rooms, what types, number of bed and price per night.


{
    "message": "Rooms retrieved successfully.",
    "rooms": {
        "Single": {
            "beds": 1,
            "pricePerNight": 1000,
            "availability": 1
        },
        "Double": {
            "beds": 2,
            "pricePerNight": 1500,
            "availability": 10
        },
        "Suit": {
            "beds": 2,
            "pricePerNight": 1800,
            "availability": 3
        }
    }
}


End point: /book-rooms

Required Json object in body
Fields:
name: Name of guest
email: email to guest
startDate: The day the guest arrives
endDate: The day the guest checks out

rooms: A array of room objects to book. One object is required

roomObject: {
		“type”: What type of room it is single, double, suit are the options
		“quantity” How many of the type of room to book 
		
	}

Example object
{
    "name": "Jöns",
    "email": "jans@jans.com",
    "guests": 2,
    "startDate": "2024-12-24",
    "endDate" : "2024-12-25",
    "rooms": [
        {
        "type": "single",
        "quantity": 2
        },
        {
        "type": "double",
        "quantity": 1
        }
    
    ]
}
