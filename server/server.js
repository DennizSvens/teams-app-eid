const express = require("express");
const hbs = require("hbs");
const dotenv = require("dotenv");
const modules = [];

// Initialize env
console.log(`Loading .env`);
dotenv.config();

class Module {
  constructor(functionName, exportedFunctionName, buttonName, module) {
    this.functionName = functionName;
    this.exportedFunctionName = exportedFunctionName;
    this.buttonName = buttonName;
    this.module = require(module);
  }
}
if (process.env.FUNKTIONSTJANSTER_ENABLE == "true") {
  console.log(`Will use Funktionstjänster BankID`);
  modules.push(
    new Module(
      "initAuthenticationFTBankID",
      "InitAuthenticationFTBankID",
      "Legitimera med BankID",
      "./modules/bankid"
    )
  );
}

if (process.env.FREJA_RESTAPI_ENABLE == "true") {
  console.log(`Will use Freja eID Rest API`);
  modules.push(
    new Module(
      "initAuthenticationFrejaAPI",
      "InitAuthenticationFrejaAPI",
      "Legitimera med Freja eID",
      "./modules/frejaeid_restapi"
    )
  );
}

// Setup express
var app = express();
app.use("/public/", express.static(__dirname + "/../public"));
app.set("viewengine", "hbs");
hbs.registerPartials(__dirname + "/../views/partials");
hbs.registerHelper("ifCond", function(v1, operator, v2, options) {
  switch (operator) {
    case "==":
      return v1 == v2 ? options.fn(this) : options.inverse(this);
    case "===":
      return v1 === v2 ? options.fn(this) : options.inverse(this);
    case "!=":
      return v1 != v2 ? options.fn(this) : options.inverse(this);
    case "!==":
      return v1 !== v2 ? options.fn(this) : options.inverse(this);
    case "<":
      return v1 < v2 ? options.fn(this) : options.inverse(this);
    case "<=":
      return v1 <= v2 ? options.fn(this) : options.inverse(this);
    case ">":
      return v1 > v2 ? options.fn(this) : options.inverse(this);
    case ">=":
      return v1 >= v2 ? options.fn(this) : options.inverse(this);
    case "&&":
      return v1 && v2 ? options.fn(this) : options.inverse(this);
    case "||":
      return v1 || v2 ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});
// Server and socket init
const server = require("http").Server(app);
const io = require("socket.io")(server);

//http-handers
app.get("/", (req, res) => {
  res.render("start.hbs", {
    pageTitle: "Legitimera medborgare",
    modules
  });
});

//SocketIO incomming
io.on("connection", function(socket) {
  modules.forEach(module => {
    socket.on(module.functionName, function(data) {
      module.module[module.exportedFunctionName](data.ssn, socket);
    });
  });
});

//Start the server!
server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
