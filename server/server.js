const express = require("express");
const hbs = require("hbs");
const dotenv = require("dotenv");
const authHelper = require('./authHelper.js');
const fs = require("fs");
const { v4 } = require("uuid");
const modules = [];

function strbool(value) {
    return value=="true" ? true : false;
}

// Initialize env
console.log('Laddar .env');
dotenv.config();

console.log("Konfigurerad applikationssökväg "+process.env.BASE_URL);
console.log("Startar i " + (strbool(process.env.TEAMS_INTEGRATED) ? "teamsintegrerat läge" : "fristående läge"));
console.log("SSL är " + (strbool(process.env.USE_SSL) ? "påslaget" : "avstängt"));
    
class Module {
  constructor(functionName, exportedFunctionName, buttonName, module) {
    this.functionName = functionName;
    this.exportedFunctionName = exportedFunctionName;
    this.buttonName = buttonName;
    this.module = require(module);
  }
}

if (strbool(process.env.FUNKTIONSTJANSTER_BANKID)) {
  console.log('Aktiverar BankID via Funktionstjänster');
  modules.push(
    new Module(
      "initAuthenticationFTBankID",
      "InitAuthenticationFTBankID",
      "Legitimera med BankID",
      "./modules/bankid"
    )
  );
}
if (strbool(process.env.FUNKTIONSTJANSTER_FREJA)) {
  console.log('Aktiverar Freja eID via Funktionstjänster');
  modules.push(
    new Module(
      "initAuthenticationFTFrejaEID",
      "InitAuthenticationFTFrejaEID",
      "Legitimera med Freja eID",
      "./modules/bankid"
    )
  );
}

if (strbool(process.env.SVENSKEIDENTITET_BANKID)) {
  console.log('Aktiverar BankID via Svensk e-Identitet');
  modules.push(
    new Module(
      "initAuthenticationSEIDBankID",
      "InitAuthenticationSEIDBankID",
      "Legitimera med BankID",
      "./modules/grandid"
    )
  );
}
if (strbool(process.env.SVENSKEIDENTITET_FREJA)) {
  console.log('Aktiverar Freja eID via Svensk e-Identitet');
  modules.push(
    new Module(
      "initAuthenticationSEIDFrejaEID",
      "InitAuthenticationSEIDFrejaEID",
      "Legitimera med Freja eID",
      "./modules/grandid"
    )
  );
}

if (strbool(process.env.FREJA_RESTAPI_ENABLE)) {
  console.log('Aktiverar Freja eID via Freja REST Api');
  modules.push(
    new Module(
      "initAuthenticationFrejaAPI",
      "InitAuthenticationFrejaAPI",
      "Legitimera med Freja eID",
      "./modules/frejaeid_restapi"
    )
  );
}

//Preppare our session storage
var session = require('express-session')({
  secret: process.env.COOKIE_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: strbool(process.env.USE_SSL) },
  name: 'eidapp'
});
const sharedsession = require("express-socket.io-session");

// Setup express
var app = express();
app.set('trust proxy', 1) // trust first proxy
app.set("viewengine", "hbs");
app.use(session);

app.use("/public/", express.static(__dirname + "/../public"));
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
var server;
if (strbool(process.env.USE_SSL)) {
     server = require("https").Server({
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CERT)
    },app);
} else {
    server = require("http").Server(app);
}
const io = require("socket.io")(server);

//http-handers

app.use(function (req, res, next) {
  if (!req.session.isAuthenticated) {
    req.session.accessToken = "";
    req.session.refreshToken = "";
    req.session.stopFlag = false;
    req.session.isAuthenticated = false;
  }
  next();
})

app.get("/", (req, res) => {
  res.render("start.hbs", {
    pageTitle: "Legitimera medborgare",
    modules: modules,
    teamsMode: strbool(process.env.TEAMS_INTEGRATED)
  });
});

if (strbool(process.env.TEAMS_INTEGRATED)) {
    app.get("/config", (req, res) => {
      res.render("config.hbs", {
          tabUrl: process.env.BASE_URL,
          tabName: process.env.TEAMS_TEAM_TABNAME,
          tabId: req.query.team+'-'+req.query.channel+'-eidtab'
      });
    });
    app.get('/logout', function (req, res) {
        req.session.accessToken = "";
        req.session.refreshToken = "";
        req.session.isAuthenticated=false;
        res.status(200);
        res.redirect('/');
    });    
    app.get('/login', (req, res) => {
        if (req.query.code !== undefined) {
            authHelper.getTokenFromCode(req.query.code, function (e, accessToken, refreshToken) {
                if (e === null) {
                    req.session.accessToken = accessToken;
                    req.session.refreshToken = refreshToken;
                    req.session.isAuthenticated = true;
                    res.render("popupcloser.hbs", {
                      pageTitle: "Authentifiera",
                    });   
                } else {
                    res.status(500);
                    res.send();
                }
            });
        } else if (req.query.init !== undefined) {
              res.redirect(authHelper.getAuthUrl());         
        } else {
            res.status(404);
            res.send();      
        }
    });
}

        
io.use(sharedsession(session, {
    autoSave:true
})); 
//SocketIO incomming
io.on("connection", function(socket) {
  modules.forEach(module => {
    socket.on(module.functionName, function(data) {
      if (!strbool(process.env.TEAMS_INTEGRATED) || socket.handshake.session.isAuthenticated) {
        module.module[module.exportedFunctionName](data.ssn, socket);
      }
    });
  });

  if (strbool(process.env.TEAMS_INTEGRATED)) {   
      socket.on('registerToken', function(data) {   
        authHelper.getTokensFromUserToken(data.token, socket);
      });
  }
});

//Start the server!
server.listen(process.env.PORT, () => {
  console.log('Server startad på port '+process.env.PORT);
});
