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

| Parameter   | Type    | Description                                     |
|-------------|---------|-------------------------------------------------|
| `guests`    | Integer | Number of guests                                |
| `startDate` | String  | Check-in date in `yyyy-mm-dd` format            |
| `endDate`   | String  | Check-out date in `yyyy-mm-dd` format           |

#### Example Request
```plaintext
GET /search-rooms?guests=2&startDate=2024-11-01&endDate=2024-11-02
```

#### Example Response

Response: Message is either "Rooms retrieved successfully.” Or  "message": "Not enough rooms available”

Followed buy a specifikations of how many rooms, what types, number of bed and price per night.
```plaintext
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
```

### 2. Book Rooms
- **Endpoint**: `/book-rooms`
- **Method**: `POST`
- **Description**: Creates a booking for specific room types over a date range.

#### Required JSON object in body

| Field      | Type   | Description                                 |
|------------|--------|---------------------------------------------|
| `name`     | String | Guest's name                                |
| `email`    | String | Guest's email address                       |
| `startDate`| String | Check-in date in `yyyy-mm-dd` format        |
| `endDate`  | String | Check-out date in `yyyy-mm-dd` format       |
| `rooms`    | Array  | An array of room objects to be booked, one object is required       |

#### Room Object Structure

| Field      | Type    | Description                                         |
|------------|---------|-----------------------------------------------------|
| `type`     | String  | Room type (`single`, `double`, `suite`)             |
| `quantity` | Integer | Number of rooms of this type to book                |

#### Example object
```plaintext
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
```
### 3. Retrieve Booking Details
- **Endpoint**: /booking/{id}
- **Method**: `GET`
- **Description**: Retrieves the details of a specific booking by its ID.

#### Path Parameter

| Field      | Type    | Description                      |
|------------|---------|----------------------------------|
| `id`       | String  | The unique ID of the booking     |

#### Example Request
```plaintext
GET /booking/ID12345
```

#### Example Response
```plaintext
{
  "bookingId": "ID12345",
  "name": "John Doe",
  "email": "john@example.com",
  "startDate": "2024-12-24",
  "endDate": "2024-12-25",
  "rooms": [
    { "type": "single", "quantity": 2 },
    { "type": "double", "quantity": 1 }
  ],
  "totalPrice": 4000
}
```
