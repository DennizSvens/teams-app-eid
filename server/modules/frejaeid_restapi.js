const { v4 } = require("uuid");
const fs = require("fs");
const request = require("request");

function convertObjectToBase64String(inputObject) {
  var jsonObject = JSON.stringify(inputObject);
  var bufferObject = Buffer.from(jsonObject);
  return bufferObject.toString("base64");
}

function createRequestBody(method, data) {
  return method + "=" + convertObjectToBase64String(data);
}

function CheckFrejaAuthResponse(transactionId) {
  var requestObject = {
    authRef: transactionId
  };

  requestOptions = {
    uri:
      process.env.FREJA_RESTAPI_SERVICE_ENDPOINT +
      "/authentication/1.0/getOneResult",
    pfx: fs.readFileSync(process.env.FREJA_RESTAPI_CERT),
    passphrase: process.env.FREJA_RESTAPI_PASS,
    ca: fs.readFileSync(process.env.FREJA_RESTAPI_CACERT),
    headers: { "content-type": "application/json" },
    body: createRequestBody("getOneAuthResultRequest", requestObject)
  };

  return new Promise(function(resolve, reject) {
    request.post(requestOptions, (err, response, body) => {
      resolve(body);
    });
  });
}

const InitAuthenticationFrejaAPI = (ssn, socket, callback=undefined) => {
  var userInfo = {
    country: "SE",
    ssn: ssn
  };

  var requestObject = {
    attributesToReturn: ["EMAIL_ADDRESS", "RELYING_PARTY_USER_ID", "BASIC_USER_INFO"],
    minRegistrationLevel: process.env.FREJA_MINIMUM_REGISTRATION_LEVEL,
    userInfoType: "SSN",
    userInfo: convertObjectToBase64String(userInfo)
  };

  requestOptions = {
    uri:
      process.env.FREJA_RESTAPI_SERVICE_ENDPOINT +
      "/authentication/1.0/initAuthentication",
    pfx: fs.readFileSync(process.env.FREJA_RESTAPI_CERT),
    passphrase: process.env.FREJA_RESTAPI_PASS,
    rejectUnauthorized: false,
    ca: fs.readFileSync(process.env.FREJA_RESTAPI_CACERT),
    headers: { "content-type": "application/json" },
    body: createRequestBody("initAuthRequest", requestObject)
  };

  request.post(requestOptions, (err, response, body) => {
    if (err) {
      return socket.emit("authenticationStatus", {
        STATUS: "ERROR",
        MESSAGE: "A communication error occured"
      });
    }

    const responseObject = JSON.parse(body);
    if (responseObject.code) {
      return socket.emit("authenticationStatus", {
        STATUS: "ERROR",
        REMOTE_STATUS: responseObject.code,
        REMOTE_DETAILS: responseObject.message,
        MESSAGE: responseObject.message
      });
    }
    socket.emit("authenticationStatus", { STATUS: "INITIALIZED" });

    var i = 1;
    const CheckResponseLoop = async () => {
      setTimeout(async function() {
        var checkResponse = await CheckFrejaAuthResponse(
          responseObject.authRef
        );
        var parsedResponse = JSON.parse(checkResponse);

        if (parsedResponse.code) {
          socket.emit("authenticationStatus", {
            STATUS: "ERROR",
            REMOTE_STATUS: parsedResponse.code,
            REMOTE_DETAILS: parsedResponse.message,
            MESSAGE: parsedResponse.message
          });
          i = 61;
        } else {
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
              socket.emit("authenticationStatus", {
                STATUS: "COMPLETED",
                DISPLAY_NAME: parsedResponse.requestedAttributes.basicUserInfo.name + ' ' + parsedResponse.requestedAttributes.basicUserInfo.surname,
                DECORATIONS: !callback ? "" : callback()
              });
              i = 61;
              break;
          }
        }
        i++;
        if (i <= 60) {
          CheckResponseLoop();
        }
      }, 3000);
    };
    CheckResponseLoop();

    return responseObject.authRef;
  });
};

module.exports = { InitAuthenticationFrejaAPI };
