require("isomorphic-fetch");
const request = require('request')
const graph = require('@microsoft/microsoft-graph-client');
const fs = require("fs");


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

    sendTemplateMessage: async function(accessToken, user, toName, toEmail, subject, template, tokenObject) {
        var content = fs.readFileSync("./templates/"+template+".txt", 'utf8');
        
        for(var tokenKey in tokenObject) {
            content = content.replace("$"+tokenKey+"$",tokenObject[tokenKey]);
            subject = subject.replace("$"+tokenKey+"$",tokenObject[tokenKey]);
        }

        var messageSender = await this.sendMessage(accessToken, user, toName, toEmail, subject, content);
        return messageSender;
    },    
    
    sendMessage: async function(accessToken, user, toname, toemail, subject, content) {
        var apiResource = "/users/"+user+"/sendMail";
        
        const client = getAuthenticatedClient(accessToken);
               
        try {
            let apiResult = await client.api(apiResource).post({ message: {
                subject: subject,
                body: { contentType: 'HTML', content: content },
                toRecipients: [{ emailAddress: { name: toname, address: toemail }}]
            }});
                                                
            return apiResult;
        } catch (error) {
            return error;
        }        
        
    },

    createAndSendMessage: async function(accessToken, user, toname, toemail, subject, content) {
        var apiResource = "/"+user+"/sendMail";
        
        const client = getAuthenticatedClient(accessToken);
               
        try {
            let apiResult = await client.api(apiResource).post({ message: {
                subject: subject,
                body: { contentType: 'HTML', content: content },
                toRecipients: [{ emailAddress: { name: toname, address: toemail }}]
            }});
                                                
            return apiResult;
        } catch (error) {
            return error;
        }        
        
    },
    
    cancelExchangeMeeting: async function(accessToken, user, id) {
        var apiResource = "/"+user+"/events/"+id;
        const client = getAuthenticatedClient(accessToken);
        try {
            let apiResult = await client.api(apiResource).delete();                        
            return apiResult;
        } catch (error) {
            return error;
        }         
    },
    
    getUserId: async function(accessToken, user) {
        var apiResource = "/"+user;
        const client = getAuthenticatedClient(accessToken);
        try {                        
            let apiResult = await client.api(apiResource).get();
            return apiResult.id;
        } catch (error) {
            return error;
        }        
            
    },
           
    createExchangeMeeting: async function(accessToken, user, internalId, startDateTime, endDateTime, ssn, name, email, subject, content, attendeeList) {
        var apiResource = "/"+user+"/events";
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
                    id: 'String {148587e4-2c99-4f6d-8a50-25bfbfb9c428} Name eIDTag',
                    value: internalId
                }],
                extensions: [{
                    '@odata.type': 'Microsoft.Graph.OpenTypeExtension',
                    extensionName: 'se.botkyrka.eid',
                    ssn: ssn,
                    name: name,
                    email: email
                }],
                attendees: attendeeList
            });
                        
            return apiResult;
        } catch (error) {
            return error;
        }        
          
    },

    getSpecificMeeting: async function(accessToken,user,meetingId) {
        var apiResource = "/"+user+"/events?$expand="+encodeURIComponent("extensions($filter=id eq 'Microsoft.OutlookServices.OpenTypeExtension.se.botkyrka.eid')")+","+
            encodeURIComponent("singleValueExtendedProperties($filter=id eq 'String {148587e4-2c99-4f6d-8a50-25bfbfb9c428} Name eIDTag')")+"&$filter="+
            encodeURIComponent("singleValueExtendedProperties/Any(ep: ep/id eq 'String {148587e4-2c99-4f6d-8a50-25bfbfb9c428} Name eIDTag' and ep/value eq '"+meetingId+"')");

        const client = getAuthenticatedClient(accessToken);
                
        try {
            let apiResult = await client.api(apiResource).get();

            if (apiResult.value.length==0) { return undefined };

            var meeting = apiResult.value[0];   

            var newObject = {
                exchange_id: meeting.id,
                allDay: meeting.isAllDay,
                start: meeting.start.dateTime+"Z",
                end: meeting.end.dateTime+"Z",
                subject: meeting.subject,
                organizer_name: meeting.organizer.emailAddress.name,
                organizer_email: meeting.organizer.emailAddress.name,
                source: 'exchange',
                joinUrl: meeting.onlineMeeting.joinUrl,
                ssn: '',
                name: '',
                email: '',
                id: meetingId
            };
            
            for(key in meeting.extensions) {
                var extension = meeting.extensions[key];
                if (extension.extensionName=='se.botkyrka.eid') {
                    newObject.ssn = extension.ssn;
                    newObject.name = extension.name;
                    newObject.email = extension.email;
                }
            }

            return newObject;

        } catch (error) {
            return error;
        }        
    },
    
    calendarView: async function(accessToken,user,startDateTime,endDateTime) {

        var apiResource = "/"+user+"/calendar/calendarView?startDateTime="+encodeURIComponent(startDateTime)+"&endDateTime="+encodeURIComponent(endDateTime)+
            "&$top=1000&$expand="+encodeURIComponent("extensions($filter=id eq 'Microsoft.OutlookServices.OpenTypeExtension.se.botkyrka.eid')")+","+
            encodeURIComponent("singleValueExtendedProperties($filter=id eq 'String {148587e4-2c99-4f6d-8a50-25bfbfb9c428} Name eIDTag')");
        var result = [];
        
        const client = getAuthenticatedClient(accessToken);
        try {
            let apiResult = await client.api(apiResource).get();
            
            for(key in apiResult.value) {
                var meeting = apiResult.value[key];
                var eid_data = { eid: false, ssn: '', name: '', email: '', id: '' };
                
                for(key in meeting.extensions) {
                    var extension = meeting.extensions[key];
                    if (extension.extensionName=='se.botkyrka.eid') {
                        eid_data.eid = true;
                        eid_data.ssn = extension.ssn;
                        eid_data.name = extension.name;
                        eid_data.email = extension.email;
                    }
                }
                                                               
                for(key in meeting.singleValueExtendedProperties) {
                    var extension = meeting.singleValueExtendedProperties[key];
                    if (extension.id=='String {148587e4-2c99-4f6d-8a50-25bfbfb9c428} Name eIDTag') {
                        eid_data.id = extension.value;
                    }
                }

                var newObject = {
                    id: meeting.id,
                    allDay: meeting.isAllDay,
                    start: meeting.start.dateTime+"Z",
                    end: meeting.end.dateTime+"Z",
                    title: meeting.subject,
                    editable: false,
                    source: 'exchange',
                    extendedProps: { exchange_object: meeting, eid_data: eid_data },
                    backgroundColor: eid_data.eid ? 'rgb(255,0,0, 0.1)' : 'rgb(0,0,255, 0.1)',
                    borderColor: eid_data.eid ? 'rgb(255,0,0)' : 'rgb(0,0,255)'
                };
                               
                result.push(newObject);
            }
            
            
            return result;
        } catch (error) {
            return error;
        }        
    }
};


