const { v4 } = require("uuid");
const fs = require("fs");
const request = require("request");
const soap = require("soap");

function CollectBankIDResponse(transactionId, orderRef, provider) {
  const messageID = v4();

  // Setup params for the call
  var requestOptions = {
    policy: process.env.FUNKTIONSTJANSTER_POLICY,
    provider: provider,
    rpDisplayName: process.env.FUNKTIONSTJANSTER_RP_DISPLAYNAME,
    transactionId: transactionId,
    orderRef: orderRef
  };

  // Make sure we accept any remote CA that is allowed
  var clientOptions = request.defaults({
    ca: fs.readFileSync(process.env.FUNKTIONSTJANSTER_CACERT)
  });

  // Just return a promise and later resolve with the result of the transaction
  return new Promise(function(resolve, reject) {
    soap.createClient(
      process.env.FUNKTIONSTJANSTER_ENDPOINT,
      { request: clientOptions, forceSoap12Headers: true },
      function(err, client) {
        client.addHttpHeader("Content-Type", "application/soap+xml");
        client.wsdl.xmlnsInHeader =
          'xmlns:wsa="http://www.w3.org/2005/08/addressing"';
        client.addSoapHeader(
          '<wsa:Action soap:mustUnderstand="1">http://mobilityguard.com/grp/service/v2.0/GrpServicePortType/CollectRequest</wsa:Action>'
        );
        client.addSoapHeader(
          '<wsa:MessageID soap:mustUnderstand="1">uuid:' +
            messageID +
            "</wsa:MessageID>"
        );
        client.Collect(requestOptions, function(err, result) {
          resolve({ err: err, result: result });
        });
      }
    );
  });
}

const InitAuthenticationFTBankID = (ssn, socket, callback=undefined) => {
    return InitAuthentication(ssn, 'bankid', socket, callback);
}

const InitAuthenticationFTFrejaEID = (ssn, socket, callback=undefined) => {
    return InitAuthentication(ssn, 'freja', socket, callback);
}

function InitAuthentication(ssn, provider, socket, callback) {
  const messageID = v4();
  const generatedTransactionID = v4();

  // Setup params for the call
  var requestOptions = {
    policy: process.env.FUNKTIONSTJANSTER_POLICY,
    provider: provider,
    rpDisplayName: process.env.FUNKTIONSTJANSTER_RP_DISPLAYNAME,
    transactionId: generatedTransactionID,
    subjectIdentifier: ssn
  };

  // Make sure we accept any remote CA that is allowed
  var clientOptions = request.defaults({
    ca: fs.readFileSync(process.env.FUNKTIONSTJANSTER_CACERT)
  });

  // Send request
  soap.createClient(
    process.env.FUNKTIONSTJANSTER_ENDPOINT,
    { request: clientOptions, forceSoap12Headers: true },
    function(err, client) {
      client.addHttpHeader("Content-Type", "application/soap+xml");
      client.wsdl.xmlnsInHeader =
        'xmlns:wsa="http://www.w3.org/2005/08/addressing"';
      client.addSoapHeader(
        '<wsa:Action soap:mustUnderstand="1">http://mobilityguard.com/grp/service/v2.0/GrpServicePortType/AuthenticateRequest</wsa:Action>'
      );
      client.addSoapHeader(
        '<wsa:MessageID soap:mustUnderstand="1">uuid:' +
          messageID +
          "</wsa:MessageID>"
      );

      //console.log(client.wsdl);

      client.Authenticate(requestOptions, function(err, result) {
        if (err) {
          // Something went horribly wrong, lets send a message and then go and die
          var regexp = /<S:Reason><S:Text xml:lang="en">(.*)<\/S:Text><\/S:Reason>.*<faultStatus>(.*)<\/faultStatus>.*<detailedDescription>(.*)<\/detailedDescription>/g;
          var matches = regexp.exec(err.response.body);
          socket.emit("authenticationStatus", {
            STATUS: "ERROR",
            REMOTE_STATUS: matches[2],
            REMOTE_DETAILS: matches[3],
            MESSAGE: matches[1]
          });
          return;
        } else {
          //Lets update client on our success
          socket.emit("authenticationStatus", { STATUS: "INITIALIZED" });

          // Yay! The remote API accepted our offering and created a transaction
          var orderRef = result.orderRef;
          var transactionId = result.transactionId;
          var i = 1;

          //Define worker loop
          const BankIDResponseLoop = async () => {
            setTimeout(async function() {
              var pollResponse = await CollectBankIDResponse(
                transactionId,
                orderRef,
                provider
              );

              // The response was an error, this means that we crashed somewhere in the loop. Tell client and then die
              if (pollResponse.err) {
                var regexp = /<S:Reason><S:Text xml:lang="en">(.*)<\/S:Text><\/S:Reason>.*<faultStatus>(.*)<\/faultStatus>.*<detailedDescription>(.*)<\/detailedDescription>/g;
                var matches = regexp.exec(pollResponse.err.response.body);

                switch (matches[2]) {
                  case "USER_CANCEL":
                    socket.emit("authenticationStatus", {
                      STATUS: "USER_DECLINED"
                    });
                    i = 61;
                    break;
                  case "EXPIRED_TRANSACTION":
                    socket.emit("authenticationStatus", { STATUS: "EXPIRED" });
                    i = 61;
                    break;
                  default:
                    socket.emit("authenticationStatus", {
                      STATUS: "ERROR",
                      REMOTE_STATUS: matches[2],
                      REMOTE_DETAILS: matches[3],
                      MESSAGE: matches[1]
                    });
                    i = 61;
                }
              } else {
                // Check if we completed, then end otherwise just pump information to client about our status.
                switch (pollResponse.result.progressStatus) {
                  case "OUTSTANDING_TRANSACTION":
                    socket.emit("authenticationStatus", {
                      STATUS: "PENDING_NO_USER"
                    });
                    break;
                  case "NO_CLIENT":
                    socket.emit("authenticationStatus", {
                      STATUS: "PENDING_NO_USER"
                    });
                    break;
                  case "COMPLETE":
                    socket.emit("authenticationStatus", {
                      STATUS: "COMPLETED",
                      DISPLAY_NAME: pollResponse.result.userInfo.displayName,
                      DECORATIONS: !callback ? "" : callback()
                    });
                    i = 61;
                    break;
                  default:
                    socket.emit("authenticationStatus", {
                      STATUS: "PENDING",
                      REMOTE_STATUS: pollResponse.result.progressStatus
                    });
                }
              }

              // Failsafe, we only do this loop 60 times, then exit
              i++;
              if (i <= 60) {
                BankIDResponseLoop();
              }
            }, 3000);
          };

          // Start looping and poll for results
          BankIDResponseLoop();

          return transactionId;
        }
      });
    }
  );
};

module.exports = { InitAuthenticationFTBankID, InitAuthenticationFTFrejaEID };
