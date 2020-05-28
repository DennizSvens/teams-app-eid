const { v4 } = require("uuid");
const fs = require("fs");
const request = require("request");

const InitAuthenticationSEIDBankID = (ssn, socket) => {
    return InitAuthentication(ssn, 'bankid', socket);
}

const InitAuthenticationSEIDFrejaEID = (ssn, socket) => {
    return InitAuthentication(ssn, 'frejaeid+', socket);
}

function InitAuthentication(ssn, provider, socket) {
         socket.emit("authenticationStatus", {
          STATUS: "ERROR",
          MESSAGE: "The selected method is not yet implemented"
        });
};

module.exports = { InitAuthenticationSEIDBankID, InitAuthenticationSEIDFrejaEID };
