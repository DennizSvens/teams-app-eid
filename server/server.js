const express = require("express");
const hbs = require("hbs");
const request = require("request");
const { v4 } = require("uuid");
const { port } = require("../config");
const fs = require("fs");
const { StartBankIDAuthentication } = require("./bankid");
var app = express();
app.use("/public/", express.static(__dirname + "/../public"));
app.set("viewengine", "hbs");
hbs.registerPartials(__dirname + "/../views/partials");
const server = require("http").Server(app);
const io = require("socket.io")(server);

app.get("/", (req, res) => {
  res.render("start.hbs", {
    pageTitle: "Legitimera medborgare"
  });
});

io.on("connection", function(socket) {
  socket.on("startBankIdAuthentication", function(data) {
    StartBankIDAuthentication(data.ssn, socket);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
