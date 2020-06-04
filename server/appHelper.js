const fs = require('fs');
const graphHelper = require('./graphHelper.js');
const { v4 } = require("uuid");


function tokenTemplate(template,tokenObject) {
    var content = fs.readFileSync("./server/templates/"+template+".txt", 'utf8');
    for(var tokenKey in tokenObject) {
        content = content.replace("$"+tokenKey+"$",tokenObject[tokenKey]);
    }
    return content;
}

async function sendTemplateMessage(accessToken, user, toName, toEmail, subject, template, tokenObject) {
    var content = fs.readFileSync("./server/templates/"+template+".txt", 'utf8');
    
    for(var tokenKey in tokenObject) {
        content = content.replace("$"+tokenKey+"$",tokenObject[tokenKey]);
    }
    var messageSender = await graphHelper.createAndSendMessage(accessToken, user, toName, toEmail, subject, content);
    return messageSender;
}


module.exports = {
    validateUUID: function validateUUID(inputString) {
        var regexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return regexp.test(inputString);
    },
    
    formatStringTime: function formatStringTime(inputString) {
        inputString = inputString.substring(0,16);
        return inputString.replace("T"," ");
    },
    
    getMeetingFile: async function getMeetingFile(accessToken, user, meetingId) {
        try {
            return await graphHelper.getSpecificMeeting(accessToken, user, meetingId);
        } catch (error) {
            return undefined;
        }
    },
    
    deleteSecureMeeting: async function deleteSecureMeeting(accessToken,user, internalId) {
        try {      
            var meetingData = await graphHelper.getSpecificMeeting(accessToken,user,internalId);
            await graphHelper.cancelExchangeMeeting(accessToken,user,meetingData.exchange_id);
            
            await sendTemplateMessage(accessToken,user, meetingData.name, meetingData.email, meetingData.subject, 'external_email_cancelled', {
                name: meetingData.organizer_name,
                starttime: meetingData.start,
                endtime: meetingData.end,
                subject: meetingData.subject
            });            
            
            return {};
        } catch (error) {
            return error;
        }
    }, 
    
    createSecureMeeting: async function createSecureMeeting(accessToken,user, startTime, endTime, ssn, name, email, subject) {
        var attendees = new graphHelper.meetingAttendeeList();
               
        var content = tokenTemplate('calendar_content', {
            ssn: ssn,
            name: name,
            email: email,
            subject: subject
        });
        
        try {           
            var internalId = v4();
            var exchangeMeeting = await graphHelper.createExchangeMeeting(accessToken,user,internalId,startTime,endTime, ssn, name,email, subject, content, attendees.getAttendeeList());
            var userId = await graphHelper.getUserId(accessToken,user);

            await sendTemplateMessage(accessToken,user,name, email, subject, 'external_email_created', {
                name: exchangeMeeting.organizer.emailAddress.name,
                link: process.env.BASE_URL+'/meet?'+userId+'-'+internalId,
                starttime: startTime,
                endtime: endTime,
                subject: subject
            });
            
            return result;
        } catch (error) {
            return exchangeMeeting;
        }
    }
        
}
