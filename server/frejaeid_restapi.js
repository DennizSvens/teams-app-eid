const { v4 } = require("uuid");
const fs = require("fs");
const request = require("request");

function convertObjectToBase64String(inputObject) {
    var jsonObject = JSON.stringify(inputObject);
    var bufferObject = Buffer.from(jsonObject);
    return bufferObject.toString('base64') 
}

function createRequestBody(method,data) {
    return method+"="+convertObjectToBase64String(data);
}

function CheckFrejaAuthResponse(transactionId) {

  var requestObject = {
      'authRef': transactionId,
  }  

  requestOptions = {
    uri: process.env.FREJA_RESTAPI_SERVICE_ENDPOINT+"/authentication/1.0/getOneResult",
    pfx: fs.readFileSync(process.env.FREJA_RESTAPI_CERT),
    passphrase: process.env.FREJA_RESTAPI_PASS,
    ca: fs.readFileSync(process.env.FREJA_RESTAPI_CACERT),
    headers: { "content-type": "application/json" },
    body: createRequestBody('getOneAuthResultRequest',requestObject)
  };

  return new Promise(function(resolve, reject) {
    request.post(requestOptions, (err, response, body) => {
      resolve(body);
    });
  });
}

const InitFrejaRESTAPiAuthRequest = (ssn, socket) => {

  var userInfo = {
      'country': "SE",
      'ssn': ssn
  }  
  
  var requestObject = {
      'attributesToReturn': ['EMAIL_ADDRESS','RELYING_PARTY_USER_ID'],
      'minRegistrationLevel': process.env.FREJA_MINIMUM_REGISTRATION_LEVEL,
      'userInfoType': 'SSN',
      'userInfo': convertObjectToBase64String(userInfo)
  }
  
  requestOptions = {
    uri: process.env.FREJA_RESTAPI_SERVICE_ENDPOINT+"/authentication/1.0/initAuthentication",
    pfx: fs.readFileSync(process.env.FREJA_RESTAPI_CERT),
    passphrase: process.env.FREJA_RESTAPI_PASS,
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.FREJA_RESTAPI_CACERT),    
    headers: { "content-type": "application/json" },
    body: createRequestBody('initAuthRequest',requestObject)
  };

  request.post(requestOptions, (err, response, body) => {

    if (err) {
      return socket.emit("frejaAuthStatus", { STATUS: "UNKNOWN_ERROR" });
    }
    
    const responseObject = JSON.parse(body);    
    if (responseObject.code) {
        return socket.emit("frejaAuthStatus", { STATUS: "API_ERROR", CODE: responseObject.code, DETAILS: responseObject.message });
    }
       
    var i = 1;    
    const CheckResponseLoop = async () => {
      setTimeout(async function() {
        var checkResponse = await CheckFrejaAuthResponse(responseObject.authRef);
        var parsedResponse = JSON.parse(checkResponse);

        if (parsedResponse.code) {
            socket.emit("frejaAuthStatus", { STATUS: "API_ERROR", CODE: parsedResponse.code, DETAILS: parsedResponse.message });
            i = 61;
        } else {
            switch (parsedResponse.status) {
                case 'STARTED':
                case 'DELIVERED_TO_MOBILE':
                    socket.emit("frejaAuthStatus", { STATUS: parsedResponse.status });
                    i++;
                    break;
                case 'REJECTED':
                case 'EXPIRED':
                case 'RP_CANCELED':
                case 'CANCELED':
                    socket.emit("frejaAuthStatus", { STATUS: parsedResponse.status });
                    i = 61;
                    break;
                case 'APPROVED':
                    socket.emit("frejaAuthStatus", { STATUS: parsedResponse.status, SUBJECT: "" });
                    i = 61;
                    break;
                default:           
                    i++;
            }
        }
        if (i <= 60) {
          CheckResponseLoop();
        }
      }, 3000);
    };
    CheckResponseLoop();
    return responseObject.authRef;
  });
};

module.exports = { InitFrejaRESTAPiAuthRequest };
