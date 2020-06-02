const fs = require('fs');
const graphHelper = require('./graphHelper.js');
const { v4 } = require("uuid");

function createMeetingObject(internalId,start,end,sender_name,sender_email,recipient_name,recipient_email,recipient_ssn,subject,link,id) {
    return {
        id: internalId,
        isCancelled: false,
        data: {
            start: start,
            end: end
        },
        recipient: {
            name: recipient_name,
            email: recipient_email,
            ssn: recipient_ssn
        },
        sender: {
            name: sender_name,
            email: sender_email
        },
        meeting: {
            subject: subject,
            link: link,
            id: id,
        }            
    };
}

function createMeetingFile(meetingData) {
    var content = JSON.stringify(meetingData);
    fs.writeFileSync("./server/data/meetings/"+meetingData.id+".json", content, 'utf8');
}

function cancelMeetingFile(meetingId) {
    var content = JSON.stringify({id:meetingId,isCancelled: true});
    fs.writeFileSync("./server/data/meetings/"+meetingId+".json", content, 'utf8');
}

function tokenTemplate(template,tokenObject) {
    var content = fs.readFileSync("./server/templates/"+template+".txt", 'utf8');
    for(var tokenKey in tokenObject) {
        content = content.replace("$"+tokenKey+"$",tokenObject[tokenKey]);
    }
    return content;
}

async function sendTemplateMessage(accessToken, toName, toEmail, subject, body, template, tokenObject) {
    var content = fs.readFileSync("./server/templates/"+template+".txt", 'utf8');
    
    for(var tokenKey in tokenObject) {
        content = content.replace("$"+tokenKey+"$",tokenObject[tokenKey]);
    }
    var messageSender = await graphHelper.createAndSendMessage(accessToken, toName, toEmail, subject, content);
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
    
    getMeetingFile: function getMeetingFile(meetingId) {
        try {
            var content = fs.readFileSync("./server/data/meetings/"+meetingId+".json", 'utf8');
            return JSON.parse(content);        
        } catch (error) {
            return {
                id: meetingId,
                isCancelled: true 
            };
        }
    },
    
    deleteSecureMeeting: async function deleteSecureMeeting(accessToken, internalId) {
        try {           
            var meetingData = getMeetingFile(internalId);
            await graphHelper.cancelExchangeMeeting(accessToken,meetingData.meeting.id);
            cancelMeetingFile(internalId);
            
            await sendTemplateMessage(accessToken, meetingData.recipient.name, meetingData.recipient.email, meetingData.meeting.subject, 'external_email_cancelled', {
                name: meetingData.sender.name,
                starttime: meetingData.data.start,
                endtime: meetingData.data.end,
                subject: meetingData.meeting.subject
            });            
            
            return messageSender;
        } catch (error) {
            return error;
        }
    }, 
    
    createSecureMeeting: async function createSecureMeeting(accessToken, startTime, endTime, ssn, name, email, subject) {
        var attendees = new graphHelper.meetingAttendeeList();
               
        var content = tokenTemplate('calendar_content', {
            ssn: ssn,
            name: name,
            email: email,
            subject: subject
        });
        
        try {           
            var internalId = v4();
            var exchangeMeeting = await graphHelper.createExchangeMeeting(accessToken,internalId,startTime,endTime, ssn, name,email, subject, content, attendees.getAttendeeList());
            var result = createMeetingObject(internalId,startTime,endTime,exchangeMeeting.organizer.emailAddress.name,exchangeMeeting.organizer.emailAddress.address,name,email,ssn,subject,exchangeMeeting.onlineMeeting.joinUrl,exchangeMeeting.id)
            createMeetingFile(result);
            
            await sendTemplateMessage(accessToken, name, email, subject, 'external_email_created', {
                name: exchangeMeeting.organizer.emailAddress.name,
                link: process.env.BASE_URL+'/meet?'+internalId,
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
