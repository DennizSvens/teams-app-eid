const { v4 } = require("uuid");
const fs = require("fs");
const request = require("request");

function CheckAuthResponse(apikey, servicekey, transactionId) {
  requestOptions = {
    uri:
      process.env.SVENSKEIDENTITET_ENDPOINT +
      "/json1.1/GetSession?apiKey="+apikey+"&authenticateServiceKey="+servicekey+"&sessionId="+transactionId,
    headers: { "content-type": "application/json" },
  };

  return new Promise(function(resolve, reject) {
    request.post(requestOptions, (err, response, body) => {
      resolve(body);
    });
  });
}

function CheckAuthResponseFreja(url,suffix) {
    requestOptions = {
        uri: url+suffix,
        headers: {
            "content-type": "application/json",
            "referer": url,
            "X-Requested-With": "XMLHttpRequest"
        }
    };
    
  return new Promise(function(resolve, reject) {
    request.get(requestOptions, (err, response, body) => {
      resolve(body);
    });
  });
}

const InitAuthenticationSEIDBankID = (ssn, socket, callback=undefined) => {
    return InitAuthentication(ssn, process.env.SVENSKEIDENTITET_APIKEY, process.env.SVENSKEIDENTITET_BANKIDKEY, socket, callback);
}

const InitAuthenticationSEIDFrejaEID = (ssn, socket, callback=undefined) => {
    return InitAuthentication(ssn, process.env.SVENSKEIDENTITET_APIKEY, process.env.SVENSKEIDENTITET_FREJAEIDKEY, socket, callback);
}

function InitAuthentication(ssn, apikey, servicekey, socket, callback) {

  var requestObject = {
    callbackUrl: "https://localhost/",
    personalNumber: ssn,
    pushNotification: Buffer.from("Legitimering").toString('base64'),
    gui: false
  };

  requestOptions = {
    uri:
      process.env.SVENSKEIDENTITET_ENDPOINT +
      "/json1.1/FederatedLogin?apiKey="+apikey+"&authenticateServiceKey="+servicekey,
    headers: { "content-type": "application/json" },
    form: requestObject
  };

  request.post(requestOptions, (err, response, body) => {
    if (err) {
      return socket.emit("authenticationStatus", {
        STATUS: "ERROR",
        MESSAGE: "A communication error occured"
      });
    }

    const responseObject = JSON.parse(body);
    
    if (responseObject.errorObject) {

            if (responseObject.errorObject.message.response) {
                // We got some good details to share
                return socket.emit("authenticationStatus", {
                    STATUS: "ERROR",
                    REMOTE_STATUS: responseObject.errorObject.code,
                    REMOTE_DETAILS: responseObject.errorObject.message.response.errorCode,
                    MESSAGE: responseObject.errorObject.message.response.details
                  });        
            } else {
                // No details, just throw and run
                return socket.emit("authenticationStatus", {
                    STATUS: "ERROR",
                    REMOTE_STATUS: responseObject.errorObject.code,
                    REMOTE_DETAILS: responseObject.errorObject.message.errorMsg,
                    MESSAGE: "Ett kommunikationsfel uppstod."
                  });        
            }
                
    } else {
        var sessionId = responseObject.sessionId;
        
        //UGLY FIX due to Svensk e-Identitet does not yet support non-gui login to Freja as of May 2020
        //Should be updated once this is supported and will use the below code for bankid most likely.
        if (!responseObject.autoStartToken) {

            // This first emulates a user following the redirectUrl to initiate the transaction
            var redirectUrl = responseObject.redirectUrl           
            requestOptions = {
                uri: responseObject.redirectUrl+"&init=1",
                headers: {
                    "content-type": "application/json",
                    "referer": redirectUrl,
                    "X-Requested-With": "XMLHttpRequest"
                },
                form: { frejaSubmit: "Logga in", userIdentifier: ssn }
            };
            request.post(requestOptions, function(err, res, body) {
                //Do nothing, response will have the freja token as { token: "" } if needed
            });

            // Let frontend know that we havent failed. yet.
            socket.emit("authenticationStatus", { STATUS: "INITIALIZED" });

            var i = 1;
            const CheckResponseLoop = async () => {
              setTimeout(async function() {
                  
                var checkResponse = await CheckAuthResponseFreja(redirectUrl,"&poll=1");
                if (checkResponse) {
                    var parsedResponse = JSON.parse(checkResponse);
                    
                    switch (parsedResponse.status) {
                        case "STARTED":
                          socket.emit("authenticationStatus", {
                            STATUS: "PENDING_NO_USER"
                          });
                          i++;
                          break;
                        case "DELIVERED_TO_MOBILE":
                          socket.emit("authenticationStatus", {
                            STATUS: "PENDING_DELIVERED"
                          });
                          break;
                        case "REJECTED":
                          socket.emit("authenticationStatus", {
                            STATUS: "ERROR",
                            REMOTE_STATUS: parsedResponse.status,
                            REMOTE_DETAILS: "The transaction was cancelled by the rp",
                            MESSAGE: "The transaction was cancelled by the rp"
                          });
                          i = 61;
                          break;
                        case "EXPIRED":
                          socket.emit("authenticationStatus", { STATUS: "EXPIRED" });
                          i = 61;
                          break;
                        case "RP_CANCELED":
                          socket.emit("authenticationStatus", {
                            STATUS: "ERROR",
                            REMOTE_STATUS: parsedResponse.status,
                            REMOTE_DETAILS: "The transaction was cancelled by the rp",
                            MESSAGE: "The transaction was cancelled by the rp"
                          });
                          i = 61;
                          break;
                        case "CANCELED":
                          socket.emit("authenticationStatus", { STATUS: "USER_DECLINED" });
                          i = 61;
                          break;
                        case "APPROVED":
                        
                          // As we are approved, this needs to be updated in the transaction
                          var checkResponse = await CheckAuthResponseFreja(redirectUrl,"&done=1");
                          
                          // Now get the details of the user
                          var checkResponse = await CheckAuthResponse(apikey,servicekey,sessionId);
                          var parsedResponse = JSON.parse(checkResponse);
                                             
                          socket.emit("authenticationStatus", {
                            STATUS: "COMPLETED",
                            DISPLAY_NAME: parsedResponse.userAttributes.requestedAttributes.basicUserInfo.name + ' ' + parsedResponse.userAttributes.requestedAttributes.basicUserInfo.surname,
                            DECORATIONS: !callback ? "" : callback()
                          });
                          i = 61;
                          break;
                      }
                } else {
                  socket.emit("authenticationStatus", {
                    STATUS: "CANCELLED",
                    REMOTE_STATUS: "POLL_FAILED",
                    REMOTE_DETAILS: "The transaction was cancelled by the rp",
                    MESSAGE: "The transaction was cancelled by the rp"
                  });                    
                  i = 61;
                }
                
                i++;
                if (i <= 60) {
                  CheckResponseLoop();
                }
              }, 3000);
            };
            CheckResponseLoop();    
            



        } else {
            
            socket.emit("authenticationStatus", { STATUS: "INITIALIZED" });

            var i = 1;
            const CheckResponseLoop = async () => {
              setTimeout(async function() {
                var checkResponse = await CheckAuthResponse(apikey, servicekey, sessionId);
                var parsedResponse = JSON.parse(checkResponse);
                                
                if (parsedResponse.errorObject) {
                    if (parsedResponse.errorObject.code=='BANKID_MSG') {
                        switch(parsedResponse.errorObject.message.hintCode) {
                            case "expiredTransaction":
                                socket.emit("authenticationStatus", { STATUS: "EXPIRED" });
                                i=61;
                                break;
                            case "outstandingTransaction":
                                socket.emit("authenticationStatus", {
                                  STATUS: "PENDING_NO_USER"
                                });
                                break;
                            case "userSign":
                                socket.emit("authenticationStatus", {
                                    STATUS: "PENDING_DELIVERED"
                                });
                                break;
                            case "noClient":
                                socket.emit("authenticationStatus", {
                                  STATUS: "PENDING_NO_USER"
                                });                        
                                break;
                            case "userCancel":
                                socket.emit("authenticationStatus", {
                                  STATUS: "USER_DECLINED"
                                });
                                i = 61;
                                break;
                            case "cancelled":
                                socket.emit("authenticationStatus", {
                                  STATUS: "CANCELLED"
                                });
                                i = 61;
                                break;                            
                            default:
                                socket.emit("authenticationStatus", {
                                  STATUS: "PENDING",
                                  REMOTE_STATUS: parsedResponse.errorObject.message.hintCode
                                });                        
                        }
                    } else {
                        socket.emit("authenticationStatus", {
                            STATUS: "ERROR",
                            REMOTE_STATUS: parsedResponse.errorObject.code,
                            REMOTE_DETAILS: parsedResponse.errorObject.message.status,
                            MESSAGE: parsedResponse.errorObject.message.hintCode
                          });
                        i=61;
                    }
                } else {
                    
                  if (parsedResponse.requestedAttributes) {
                      socket.emit("authenticationStatus", {
                        STATUS: "COMPLETED",
                        DISPLAY_NAME: parsedResponse.requestedAttributes.basicUserInfo.name + " " + parsedResponse.requestedAttributes.basicUserInfo.surname,
                        DECORATIONS: !callback ? "" : callback()
                      });
                  } else {                    
                      socket.emit("authenticationStatus", {
                        STATUS: "COMPLETED",
                        DISPLAY_NAME: parsedResponse.userAttributes.name,
                        DECORATIONS: !callback ? "" : callback()
                      });
                  }
                  i = 61;                
                }

                i++;
                if (i <= 60) {
                  CheckResponseLoop();
                }
              }, 3000);
            };
            CheckResponseLoop();                
        }
    }

    return responseObject.sessionId;
  });
};

module.exports = { InitAuthenticationSEIDBankID, InitAuthenticationSEIDFrejaEID };
