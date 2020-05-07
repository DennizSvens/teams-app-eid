const { v4 } = require("uuid");
const fs = require("fs");
const { endpoint, policy, rpDisplayName, caPath } = require("../config");
const request = require("request");
function CollectBankIDResponse(transactionId, orderRef) {
  const messageID = v4();
  //Sending RAW XML since EasySoap/soap libraries does not have support for MessageID which is required by CGI
  XMLRequestData = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:v2="http://mobilityguard.com/grp/service/v2.0/">
      <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing"><wsa:Action>http://mobilityguard.com/grp/service/v2.0/GrpServicePortType/CollectRequest</wsa:Action><wsa:MessageID>uuid:${messageID}</wsa:MessageID></soap:Header>
      <soap:Body>
         <v2:CollectRequest>
            <policy>${policy}</policy>
            <provider>bankid</provider>
            <rpDisplayName>${rpDisplayName}</rpDisplayName>
            <transactionId>${transactionId}</transactionId>
            <orderRef>${orderRef}</orderRef>
         </v2:CollectRequest>
      </soap:Body>
   </soap:Envelope>`;

  CollectOptions = {
    url: endpoint,
    headers: {
      "Content-Type": "application/soap+xml",
      charset: "UTF-8",
      action:
        "http://mobilityguard.com/grp/service/v2.0/GrpServicePortType/CollectRequest",
      "Content-length": XMLRequestData.length
    },
    ca: fs.readFileSync(caPath),
    body: XMLRequestData
  };

  return new Promise(function(resolve, reject) {
    request.post(CollectOptions, (err, response, body) => {
      resolve(body);
    });
  });
}
const StartBankIDAuthentication = (ssn, socket) => {
  const messageID = v4();
  const generatedTransactionID = v4();
  //Sending RAW XML since EasySoap/soap libraries does not have support for MessageID which is required by CGI
  XMLRequestData = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:v2="http://mobilityguard.com/grp/service/v2.0/">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing"><wsa:Action soap:mustUnderstand="1">http://mobilityguard.com/grp/service/v2.0/GrpServicePortType/AuthenticateRequest</wsa:Action><wsa:MessageID soap:mustUnderstand="1">uuid:${messageID}</wsa:MessageID></soap:Header>
  <soap:Body>
     <v2:AuthenticateRequest>
        <policy>${policy}</policy>
        <provider>bankid</provider>
        <rpDisplayName>${rpDisplayName}</rpDisplayName>
        <transactionId>${generatedTransactionID}</transactionId>
        <subjectIdentifier>${ssn}</subjectIdentifier>
     </v2:AuthenticateRequest>
  </soap:Body>
  </soap:Envelope>`;
  AuthenticateOptions = {
    url: endpoint,
    headers: {
      "Content-Type": "application/soap+xml",
      charset: "UTF-8",
      action:
        "http://mobilityguard.com/grp/service/v2.0/GrpServicePortType/AuthenticateRequest",
      "Content-length": XMLRequestData.length
    },
    ca: fs.readFileSync(caPath),
    body: XMLRequestData
  };

  request.post(AuthenticateOptions, (err, response, body) => {
    if (err) {
      return socket.emit("bankIDResponse", { STATUS: "UNKNOWN_ERROR" });
    }
    const orderRef = body.match("<orderRef>(.*?)</orderRef>");
    if (!orderRef || !orderRef[1]) {
      return socket.emit("bankIDResponse", { STATUS: "NO_ORDER_REF" });
    }
    const transactionId = body.match("<transactionId>(.*?)</transactionId>")[1];
    var i = 1;
    const BankIDResponseLoop = async () => {
      setTimeout(async function() {
        var bodyResp = await CollectBankIDResponse(
          transactionId[1],
          orderRef[1],
          socket
        );
        var progressStatus = bodyResp.match(
          "<progressStatus>(.*?)</progressStatus>"
        );
        var BankIDName = bodyResp.match("<displayName>(.*?)</displayName>");
        var faultStatus = bodyResp.match("<faultStatus>(.*?)</faultStatus>");
        if (faultStatus && faultStatus[1] == "USER_CANCEL") {
          socket.emit("bankIDResponse", { STATUS: "USER_CANCEL" });
          i = 60;
        } else if (faultStatus && faultStatus[1] == "EXPIRED_TRANSACTION") {
          socket.emit("bankIDResponse", {
            STATUS: "EXPIRED_TRANSACTION"
          });
          i = 60;
        } else if (progressStatus[1] == "COMPLETE") {
          socket.emit("bankIDResponse", {
            STATUS: "COMPLETE",
            BankIDName: BankIDName[1]
          });
          i = 60;
        }

        i++;
        if (i <= 60) {
          BankIDResponseLoop();
        }
      }, 3000);
    };
    BankIDResponseLoop();
    return transactionId;
  });
};

module.exports = { StartBankIDAuthentication };
