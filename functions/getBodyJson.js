module.exports.getBodyJson = (event) => {
    try {
        const body = JSON.parse(event.body);
        // if (!body.text){
        //     return {error : 'Missing text value'}
        // }
        return body;
        
    } catch (error) {
        return {error : "Bad formated JSON"}
    }
}