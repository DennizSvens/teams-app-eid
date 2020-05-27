const express = require("express");
const hbs = require("hbs");
const dotenv = require("dotenv");
const path = require("path");
const modules = {};
const { InitAuthenticationFTBankID } = require("./bankid");
const { InitAuthenticationFrejaAPI } = require("./frejaeid_restapi");

// Initialize env
console.log(`Loading .env`);
dotenv.config();

if (process.env.FUNKTIONSTJANSTER_ENABLE=='true') {
 console.log(`Will use Funktionstjänster BankID`);
 modules['initAuthenticationFTBankID'] = "BankID";
}

if (process.env.FREJA_RESTAPI_ENABLE=='true') {
 console.log(`Will use Freja eID Rest API`);
 modules['initAuthenticationFrejaAPI'] = "Freja eID";
}


// Setup express
var app = express();
app.use("/public/", express.static(__dirname + "/../public"));
app.set("viewengine", "hbs");
hbs.registerPartials(__dirname + "/../views/partials");

// Server and socket init
const server = require("http").Server(app);
const io = require("socket.io")(server);

//http-handers
app.get("/", (req, res) => {
  res.render("start.hbs", {
    pageTitle: "Legitimera medborgare"
  });
});

//SocketIO incomming
io.on("connection", function(socket) {

  socket.on("getCapabilities", function(data) {
    socket.emit("capList", modules);
  });

  if ('initAuthenticationFTBankID' in modules) {
      socket.on("initAuthenticationFTBankID", function(data) {
        InitAuthenticationFTBankID(data.ssn, socket);
      });
  }
  if ('initAuthenticationFrejaAPI' in modules) {
      socket.on("initAuthenticationFrejaAPI", function(data) {
        InitAuthenticationFrejaAPI(data.ssn, socket);
      });
  }
});

//Start the server!
server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
