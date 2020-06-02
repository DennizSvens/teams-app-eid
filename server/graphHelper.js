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
    
    meetingAttendeeList: class MeetingAttendeeList {
      constructor() {
        this.attendees = [];
      }
      addAttendee(toName,toEmail,type="optional") {
        this.attendees.push({emailAddress: {address: toEmail, name: toName}, type: type})
      }
      getAttendeeList() {
        return this.attendees;
      }
    },
    
    createAndSendMessage: async function(accessToken, toname, toemail, subject, content) {
        var apiResource = "/me/messages";
        
        const client = getAuthenticatedClient(accessToken);
        
        try {
                        
            let apiResult = await client.api(apiResource).post({
                subject: subject,
                body: { contentType: 'HTML', content: content },
                toRecipients: [{ emailAddress: { name: toname, address: toemail }}]
            });
            
            apiResource = "/me/messages/"+apiResult.id+"/send";
            apiResult = await client.api(apiResource).post();
                                    
            return apiResult;
        } catch (error) {
            return error;
        }        
        
    },
    
    cancelExchangeMeeting: async function(accessToken, id) {
        var apiResource = "/me/events/"+id;
        const client = getAuthenticatedClient(accessToken);
        try {
            let apiResult = await client.api(apiResource).delete();                        
            return apiResult;
        } catch (error) {
            return error;
        }         
    },
           
    createExchangeMeeting: async function(accessToken, internalId, startDateTime, endDateTime, ssn, name, email, subject, content, attendeeList) {
        var apiResource = "/me/events";
        const client = getAuthenticatedClient(accessToken);
        
        try {
                        
            let apiResult = await client.api(apiResource).post({
                start: { dateTime: startDateTime, timeZone: 'GMT Standard Time' }, //W. Europe Standard Time
                end:  { dateTime: endDateTime, timeZone: 'GMT Standard Time' },
                body: { contentType: 'HTML', content: content },
                location: { displayName: 'Säkert teamsmöte' },
                isOnlineMeeting: true,
                onlineMeetingProvider: 'teamsForBusiness',
                subject: subject,
                singleValueExtendedProperties: [{
                    id: 'String {ebd7766c-5018-4c81-9387-6ac67bdf8d83} Name eIDData',
                    value: ssn+","+name+","+email+","+internalId }],
                attendees: attendeeList
            });
                        
            return apiResult;
        } catch (error) {
            return error;
        }        
          
    },    
    
    calendarView: async function(accessToken,startDateTime,endDateTime) {

        var apiResource = "/me/calendar/calendarView?startDateTime="+encodeURIComponent(startDateTime)+"&endDateTime="+encodeURIComponent(endDateTime)+
            "&$expand="+encodeURIComponent("singleValueExtendedProperties($filter=id eq 'String {ebd7766c-5018-4c81-9387-6ac67bdf8d83} Name eIDData')");
        var result = [];

        const client = getAuthenticatedClient(accessToken);
        try {
            let apiResult = await client.api(apiResource).get();
            
            for(key in apiResult.value) {
                var meeting = apiResult.value[key];
                                                               
                var newObject = {
                    id: meeting.id,
                    allDay: meeting.isAllDay,
                    start: meeting.start.dateTime+"Z",
                    end: meeting.end.dateTime+"Z",
                    title: meeting.subject,
                    editable: false,
                    source: 'exchange',
                    extendedProps: { exchange_object: meeting, eid_data: { eid: false, ssn: '', name: '', email: '' } },
                    backgroundColor: meeting.singleValueExtendedProperties ? 'rgb(255,0,0, 0.1)' : 'rgb(0,0,255, 0.1)',
                    borderColor: meeting.singleValueExtendedProperties ? 'rgb(255,0,0)' : 'rgb(0,0,255)'
                };

                if (meeting.singleValueExtendedProperties) {
                    var eIDData = meeting.singleValueExtendedProperties[0].value.split(',');
                    newObject.extendedProps.eid_data = {
                        eid: true,
                        ssn: eIDData[0],
                        name: eIDData[1],
                        email: eIDData[2],
                        eidid: eIDData[3]
                    } 
                }
                               
                result.push(newObject);
            }
            
            
            return result;
        } catch (error) {
            return error;
        }        
    }
};


