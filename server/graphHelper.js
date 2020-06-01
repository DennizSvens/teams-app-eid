require("isomorphic-fetch");
var graph = require('@microsoft/microsoft-graph-client');

function getAuthenticatedClient(accessToken) {
    const client = graph.Client.init({
        defaultVersion: 'v1.0',
        debugLogging: false,
        authProvider: function(authDone) {
            authDone(null, accessToken);
        }
    });

    return client;
}

module.exports = {
    calendarView: async function(accessToken,startDateTime,endDateTime) {

        var apiResource = "/me/calendar/calendarView?startDateTime="+encodeURIComponent(startDateTime)+"&endDateTime="+encodeURIComponent(endDateTime);
        var result = [];

        const client = getAuthenticatedClient(accessToken);
        try {
            var apiResult = await client.api(apiResource).get();
            
            for(key in apiResult.value) {
                var meeting = apiResult.value[key];
                
               //console.log(meeting);
                
                var newObject = {
                    id: meeting.id,
                    allDay: meeting.isAllDay,
                    start: meeting.start.dateTime,
                    end: meeting.end.dateTime,
                    title: meeting.subject,
                    editable: false,
                    source: 'exchange',
                    extendedProps: meeting,
                    backgroundColor: meeting.isOnlineMeeting ? 'rgb(0,0,255, 0.1)' : 'rgb(0,0,255, 0.1)',
                    borderColor: meeting.isOnlineMeeting ? 'rgb(255,0,0)' : 'rgb(0,0,255)'
                };
                
                result.push(newObject);
            }
            
            
            return result;
        } catch (error) {
            return error;
        }        
    }
};


