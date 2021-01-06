const express = require("express");
const hbs = require("hbs");
const dotenv = require("dotenv");
const fs = require("fs");
const helmet = require("helmet");
const SMTPServer = require("smtp-server").SMTPServer;
const simpleParser = require("mailparser").simpleParser;
const nodemailer = require("nodemailer");

// Internal support modules
const authHelper = require("./authHelper.js");
const graphHelper = require("./graphHelper.js");
const appHelper = require("./appHelper.js");

// Our global app modules
const modules = [];

// Supporting function to compare bolleanish strings
function strbool(value) {
  return value == "true" ? true : false;
}

// Initialize env
console.log("Laddar .env");
dotenv.config();

console.log("Konfigurerad applikationssökväg " + process.env.BASE_URL);
console.log(
  "Startar i " +
    (strbool(process.env.TEAMS_INTEGRATED)
      ? "teamsintegrerat läge"
      : "fristående läge")
);
console.log(
  "SSL är " + (strbool(process.env.USE_SSL) ? "påslaget" : "avstängt")
);

// Initialize the application token from azure AD
authHelper.getApplicationToken(function (token, err) {
  if (!err) {
    console.log("Hämtade åtkomstnyckel");
    global.access_token = token;
  } else {
    console.log("Kunde inte hämta åtkomstnyckel");
    process.exit();
  }
});

// Definition of a module
class Module {
  constructor(buttonName, functionName, module, config) {
    this.functionName = functionName;
    this.buttonName = buttonName;
    this.provider = require("eid-provider")(module);

    // Load default config
    var defaultConfig = strbool(process.env.AUTH_TESTING)
      ? this.provider.settings.testing
      : this.provider.settings.production;

    // Override each config from the external
    for (var key in config) {
      defaultConfig[key] = config[key];
    }

    // Set the config for the module
    this.provider.initialize(defaultConfig);
  }
}

// Lets see which modules to start up
// Native services
if (strbool(process.env.FREJA_ENABLE)) {
  console.log("Aktiverar Freja eID via Freja API");
  modules.push(
    new Module(
      "Legitimera med Freja eID",
      "initAuthenticationFrejaEID",
      "frejaeid",
      {
        client_cert: fs.readFileSync(
          process.cwd() + "/" + process.env.FREJA_CERT
        ),
        password: process.env.FREJA_PASS,
        minimumLevel: process.env.FREJA_MINIMUM_REGISTRATION_LEVEL,
      }
    )
  );
}
if (strbool(process.env.BANKID_ENABLE)) {
  console.log("Aktiverar BankID via BankID API");
  modules.push(
    new Module("Legitimera med BankID", "initAuthenticationBankID", "bankid", {
      client_cert: fs.readFileSync(
        process.cwd() + "/" + process.env.BANKID_CERT
      ),
      password: process.env.BANKID_PASS,
      allowFingerprint: strbool(process.env.BANKID_ALLOW_FINGERPRINT),
    })
  );
}
if (strbool(process.env.FREJAORGID_ENABLE)) {
  console.log("Aktiverar OrgID via Freja eID");
  modules.push(
    new Module(
      "Legitimera med OrganisationsID",
      "initAuthenticationFrejaOrgID",
      "frejaorgid",
      {
        client_cert: fs.readFileSync(
          process.cwd() + "/" + process.env.FREJA_CERT
        ),
        password: process.env.FREJA_PASS,
      }
    )
  );
}
// Gateway services
if (strbool(process.env.FUNKTIONSTJANSTER_BANKID)) {
  console.log("Aktiverar BankID via Funktionstjänster");
  modules.push(
    new Module(
      "Legitimera med BankID",
      "initAuthenticationFTBankID",
      "ftbankid",
      {
        display_name: process.env.FUNKTIONSTJANSTER_RP_DISPLAYNAME,
        policy: process.env.FUNKTIONSTJANSTER_POLICY,
      }
    )
  );
}
if (strbool(process.env.FUNKTIONSTJANSTER_FREJA)) {
  console.log("Aktiverar Freja eID via Funktionstjänster");
  modules.push(
    new Module(
      "Legitimera med Freja eID",
      "initAuthenticationFTFrejaEID",
      "ftfrejaeid",
      {
        display_name: process.env.FUNKTIONSTJANSTER_RP_DISPLAYNAME,
        policy: process.env.FUNKTIONSTJANSTER_POLICY,
      }
    )
  );
}
if (strbool(process.env.SVENSKEIDENTITET_BANKID)) {
  console.log("Aktiverar BankID via Svensk e-Identitet");
  modules.push(
    new Module(
      "Legitimera med BankID",
      "initAuthenticationSEIDBankID",
      "gbankid",
      {
        servicekey: process.env.SVENSKEIDENTITET_BANKIDKEY,
        apikey: process.env.SVENSKEIDENTITET_APIKEY,
      }
    )
  );
}
if (strbool(process.env.SVENSKEIDENTITET_FREJA)) {
  console.log("Aktiverar Freja eID via Svensk e-Identitet");
  modules.push(
    new Module(
      "Legitimera med Freja eID",
      "initAuthenticationSEIDFrejaEID",
      "gfrejaeid",
      {
        servicekey: process.env.SVENSKEIDENTITET_FREJAEIDKEY,
        apikey: process.env.SVENSKEIDENTITET_APIKEY,
      }
    )
  );
}

//Preppare our session storage
var io_session = require("express-socket.io-session");
var e_session = require("express-session");
var ee_session = e_session({
  secret: process.env.COOKIE_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: strbool(process.env.USE_SSL) },
  name: "eidapp",
});
const sharedsession = require("express-socket.io-session");
const { env } = require("process");

// Setup express
var app = express();
app.set("trust proxy", 1); // trust first proxy
app.set("viewengine", "hbs");
app.use(ee_session);
app.use(
  helmet({
    frameguard: false,
  })
);

app.use("/public/", express.static(__dirname + "/../public"));
hbs.registerPartials(__dirname + "/../views/partials");
hbs.registerHelper("ifCond", function (v1, operator, v2, options) {
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
  server = require("https").Server(
    {
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CERT),
    },
    app
  );
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
    req.session.save();
  }
  next();
});

if (strbool(process.env.TEAMS_INTEGRATED)) {
  app.get("/", (req, res) => {
    res.render("blank.hbs", {
      pageTitle: "Mötesportalen",
    });
  });

  app.get("/meet", (req, res) => {
    var query = req._parsedUrl.query;

    if (!query.length == 73) {
      res.status(404);
      res.send();
    } else {
      var mid = query.substring(37, 73);
      var uid = query.substring(0, 36);

      if (appHelper.validateUUID(mid) && appHelper.validateUUID(uid)) {
        appHelper
          .getMeetingFile(global.access_token, "users/" + uid, mid)
          .then(function (file) {
            if (file.statusCode) {
              res.render("nomeet.hbs", {
                pageTitle: "Mötesportalen",
                title: "Mötet inställt",
                message:
                  "Mötet har ställts in. Kontakta den du bokade mötet med för mer information.",
                meetingId: req.query.mid,
              });
            } else {
              res.render("meet.hbs", {
                pageTitle: "Mötesportalen",
                modules: modules,
                starttime: appHelper.formatStringTime(file.start),
                endtime: appHelper.formatStringTime(file.end),
                subject: file.subject,
                sender: file.organizer_name,
                recipient: file.name,
                meetingId: query,
              });
            }
          });
      } else {
        res.status(404);
        res.send();
      }
    }
  });

  app.get("/identify", (req, res) => {
    res.render("identify.hbs", {
      pageTitle: "Legitimera medborgare",
      modules: modules,
      teamsMode: true,
    });
  });

  app.get("/calendar", (req, res) => {
    if (!req.session.isAuthenticated) {
      res.status(403);
      res.send();
      return;
    }
    res.render("calendar.hbs", {
      pageTitle: "Säkra möten",
    });
  });

  app.get("/calendar/events", (req, res) => {
    if (!req.session.isAuthenticated) {
      res.status(403);
      res.send();
      return;
    }
    graphHelper
      .calendarView(
        req.session.access_token,
        "me",
        req.query.start,
        req.query.end
      )
      .then(function (result) {
        res.status(200);
        res.send(result);
      });
  });

  app.get("/config", (req, res) => {
    if (!req.session.isAuthenticated) {
      res.status(403);
      res.send();
      return;
    }
    res.render("config.hbs", {
      tabUrl: process.env.BASE_URL + "/calendar",
      tabName: process.env.TEAMS_TEAM_TABNAME,
      tabId: req.query.team + "-" + req.query.channel + "-eidtab",
    });
  });

  app.get("/logout", function (req, res) {
    if (!req.session.isAuthenticated) {
      res.status(403);
      res.send();
      return;
    }
    req.session.accessToken = "";
    req.session.refreshToken = "";
    req.session.isAuthenticated = false;
    res.status(200);
    res.redirect("/");
  });

  app.get("/login", (req, res) => {
    if (req.query.code !== undefined) {
      authHelper.getTokenFromCode(
        req.query.code,
        function (e, accessToken, refreshToken) {
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
        }
      );
    } else if (req.query.init !== undefined) {
      res.redirect(authHelper.getAuthUrl());
    } else {
      res.status(404);
      res.send();
    }
  });
} else {
  app.get("/", (req, res) => {
    res.render("identify.hbs", {
      pageTitle: "Legitimera medborgare",
      modules: modules,
      teamsMode: false,
    });
  });
}

if (strbool(process.env.SMTP_ENABLED)) {
  app.get("/view", (req, res) => {
    var query = req._parsedUrl.query;

    if (
      !appHelper.validateUUID(req.query.id) ||
      !appHelper.validateUUID(req.query.key)
    ) {
      return res.status(404).render("msgno.hbs", {
        pageTitle: "Felaktig länk",
        message: "Den länk du använt är inte korrekt",
      });
    }

    if (!fs.existsSync("./server/maildata/" + req.query.id + ".json")) {
      return res.status(404).render("msgno.hbs", {
        pageTitle: "Meddelandet finns ej",
        message:
          "Meddelandet du försökte öppna finns inte. Kontakta avsändaren.",
      });
    }

    var fileData = JSON.parse(
      fs.readFileSync("./data/" + req.query.id + ".json")
    );

    if (!fileData.msgKey === req.query.key) {
      return res.status(403).render("msgno.hbs", {
        pageTitle: "Ej behörig",
        message: "Du är inte behörig att läsa meddeladet. Kontakta avsändaren.",
      });
    }

    var attachments = [];

    res.render("msgview.hbs", {
      pageTitle: "Visa meddelande",
      subject: fileData.subject,
      sender: fileData.sender,
      id: req.query.id,
      key: req.query.key,
      attachments: fileData.attachments,
    });
  });

  app.get("/viewpart", (req, res) => {
    var query = req._parsedUrl.query;

    if (
      !appHelper.validateUUID(req.query.id) ||
      !appHelper.validateUUID(req.query.key)
    ) {
      return res.status(404).render("msgno.hbs", {
        pageTitle: "Felaktig länk",
        message: "Den länk du använt är inte korrekt",
      });
    }

    if (!fs.existsSync("./server/maildata/" + req.query.id + ".json")) {
      return res.status(404).render("msgno.hbs", {
        pageTitle: "Meddelandet finns ej",
        message:
          "Meddelandet du försökte öppna finns inte. Kontakta avsändaren.",
      });
    }

    var fileData = JSON.parse(
      fs.readFileSync("./data/" + req.query.id + ".json")
    );

    if (!fileData.msgKey === req.query.key) {
      return res.status(403).render("msgno.hbs", {
        pageTitle: "Ej behörig",
        message: "Du är inte behörig att läsa meddeladet. Kontakta avsändaren.",
      });
    }

    try {
      res.status(200).send(fileData[req.query.part]);
    } catch (error) {
      return res.status(404).send("Informationsmängden saknas.");
    }
  });

  app.get("/viewfile", (req, res) => {
    var query = req._parsedUrl.query;

    if (
      !appHelper.validateUUID(req.query.id) ||
      !appHelper.validateUUID(req.query.key)
    ) {
      return res.status(404).render("msgno.hbs", {
        pageTitle: "Felaktig länk",
        message: "Den länk du använt är inte korrekt",
      });
    }

    if (!fs.existsSync("./server/maildata/" + req.query.id + ".json")) {
      return res.status(404).render("msgno.hbs", {
        pageTitle: "Meddelandet finns ej",
        message:
          "Meddelandet du försökte öppna finns inte. Kontakta avsändaren.",
      });
    }

    var fileData = JSON.parse(
      fs.readFileSync("./server/maildata/" + req.query.id + ".json")
    );

    if (!fileData.msgKey === req.query.key) {
      return res.status(403).render("msgno.hbs", {
        pageTitle: "Ej behörig",
        message: "Du är inte behörig att läsa meddeladet. Kontakta avsändaren.",
      });
    }

    try {
      var attachment = fileData.attachments.find(
        (x) => x.content === req.query.file
      );
      var contentData = fs.readFileSync(
        "./server/maildata/" +
          req.query.id +
          "_" +
          req.query.file +
          ".attachment"
      );
      res.set("Content-Type", attachment.contentType);
      res.set("Access-Control-Allow-Origin", "*");
      res.set(
        "Content-Disposition",
        "attachment;filename=" + attachment.filename
      );
      res.status(200).send(contentData);
    } catch (error) {
      return res.status(404).send("Informationsmängden saknas.");
    }
  });
}

io.use(
  io_session(ee_session, {
    autoSave: true,
  })
);

//SocketIO incomming
io.on("connection", function (socket) {
  modules.forEach((module) => {
    socket.on(module.functionName, function (data) {
      if (
        socket.handshake.session.isAuthenticated ||
        !strbool(process.env.TEAMS_INTEGRATED)
      ) {
        module.provider
          .authRequest(
            data.ssn,
            function (init) {
              socket.emit("authenticationStatus", init);
            },
            function (update) {
              socket.emit("authenticationStatus", update);
            }
          )
          .then(function (completed) {
            socket.emit("authenticationStatus", completed);
          });
      }
    });
  });

  if (strbool(process.env.TEAMS_INTEGRATED)) {
    modules.forEach((module) => {
      socket.on("p" + module.functionName, function (data) {
        var mid = data.meeting.substring(37, 73);
        var uid = data.meeting.substring(0, 36);

        var file = appHelper
          .getMeetingFile(global.access_token, "users/" + uid, mid)
          .then(function (file) {
            if (file) {
              module.provider
                .authRequest(
                  file.ssn,
                  function (init) {
                    socket.emit("authenticationStatus", init);
                  },
                  function (update) {
                    socket.emit("authenticationStatus", update);
                  }
                )
                .then(function (completed) {
                  if (completed.status === "completed") {
                    completed.joinUrl = file.joinUrl;
                  }
                  socket.emit("authenticationStatus", completed);
                });
            }
          });
      });
    });

    if (strbool(process.env.SMTP_ENABLED)) {
      modules.forEach((module) => {
        socket.on("m" + module.functionName, function (data) {
          var fileData = JSON.parse(
            fs.readFileSync("./data/" + data.id + ".json")
          );

          module.provider
            .authRequest(
              fileData.ssn,
              function (init) {
                socket.emit("authenticationStatus", init);
              },
              function (update) {
                socket.emit("authenticationStatus", update);
              }
            )
            .then(function (completed) {
              if (completed.status === "completed") {
                (completed.msgId = data.id),
                  (completed.msgKey = fileData.msgKey);
              }
              socket.emit("authenticationStatus", completed);
            });
        });
      });
    }

    socket.on("registerToken", function (data) {
      authHelper.getTokensFromUserToken(data.token, socket);
    });

    socket.on("createSecureMeeting", function (data) {
      if (socket.handshake.session.isAuthenticated) {
        appHelper
          .createSecureMeeting(
            socket.handshake.session.access_token,
            "me",
            data.start,
            data.end,
            data.ssn,
            data.name,
            data.email,
            data.subject
          )
          .then(function (result) {
            socket.emit("meetingCreated", {
              NAME: data.name,
              START: appHelper.formatStringTime(data.start),
            });
          });
      }
    });

    socket.on("deleteSecureMeeting", function (data) {
      if (socket.handshake.session.isAuthenticated) {
        appHelper
          .deleteSecureMeeting(
            socket.handshake.session.access_token,
            "me",
            data.id
          )
          .then(function (result) {
            socket.emit("calendarUpdate", {});
          });
      }
    });
  }
});

//Start the server!
server.listen(process.env.PORT, () => {
  console.log("Server startad på port " + process.env.PORT);
});

function onConnect(session, callback) {
  if (
    !process.env.SENDER_HOSTS === "*" &&
    !session.remoteAddress in process.env.SENDER_HOSTS.split(",")
  ) {
    console.log("Anslutning från " + session.remoteAddress + " är ej behörig");
    return callback(new Error("You are not allowed to connect here."));
  }
  console.log("Anslutning från " + session.remoteAddress + " kommer bearbetas");
  return callback(); // Accept the connection
}

function onMailFrom(address, session, callback) {
  if (!address.address in process.env.SENDER_DOMAINS.split(",")) {
    console.log("Nekade avsändare " + address.address);
    return callback(new Error("You are not allowed to send mail here."));
  }
  return callback(); // Accept the address
}

function onRcptTo(address, session, callback) {
  return callback(); // Accept the address always
}

function onClose(session) {
  console.log("Anslutning från " + session.remoteAddress + " har avslutats.");
}

function onData(stream, session, callback) {
  simpleParser(stream, {})
    .then((parsed) => {
      var msgId = uuid.v4();
      var recipient_regexp = /([0-9]{12})\+(.*)/g;
      var recipient_data = recipient_regexp.exec(parsed.to.value[0].address);

      // This is a ugly fix to pass validation in o365 connectors, but, hey, it works!
      if (parsed.from.value[0].address.startsWith("O365ConnectorValidation"))
        return callback();

      // Make sure we got a valid recipient
      if (!recipient_data === null || recipient_data.length != 3) {
        console.log("Nekade avsändare " + parsed.from.value[0].address);
        err = new Error("The recipient email is not valid.");
        err.responseCode = 541;
        return callback(err);
      }

      // Do some logging
      console.log("Meddelande från " + parsed.from.value[0].address);
      console.log(
        "Meddelande till " +
          recipient_data[2] +
          " (Legitimeras som " +
          recipient_data[1] +
          ")"
      );

      // Create a json file to store mail data
      var mailObject = {
        sender: parsed.from.text,
        recipient: recipient_data[2],
        ssn: recipient_data[1],
        msgid: parsed.messageId,
        msgKey: uuid.v4(),
        subject: parsed.subject,
        text: parsed.text,
        html: parsed.html,
        attachments: [],
      };

      // Oh, yeha, take care of the attachments
      parsed.attachments.forEach((attachment) => {
        if (attachment.type === "attachment") {
          var attachmentid = uuid.v4();
          var newAttachment = {
            size: attachment.size,
            filename: attachment.filename,
            contentType: attachment.contentType,
            content: attachmentid,
          };
          mailObject.attachments.push(newAttachment);
          fs.writeFileSync(
            "./server/maildata/" + msgId + "_" + attachmentid + ".attachment",
            attachment.content
          );
        }
      });

      // Dump it to disk
      fs.writeFileSync(
        "./server/maildata/" + msgId + ".json",
        JSON.stringify(mailObject)
      );

      // Create a email message to the recipient
      graphHelper.sendTemplateMessage(
        global.access_token,
        parsed.from.value[0].address,
        parsed.to.value[0].name,
        recipient_data[2],
        process.env.MESSAGE_SUBJECT,
        "mail_content",
        {
          link: process.env.BASE_URL + "/?" + msgId,
          subject: parsed.subject,
          sender_name: parsed.from.value[0].name,
          sender_email: parsed.from.value[0].address,
        }
      );

      console.log("Meddelandebearbetning klar");
      callback();
    })
    .catch((err) => {
      console.log(err);
    });
}
if (strbool(process.env.SMTP_ENABLED)) {
  var smtp_server_options = {
    secure: false,
    name: process.env.SMTP_DOMAIN,
    banner: "Node.js eID Secure Mail Server",
    authOptional: true,
    disabledCommands: ["AUTH"],
    onConnect: onConnect,
    onMailFrom: onMailFrom,
    onRcptTo: onRcptTo,
    onData: onData,
  };

  const smtp_server = new SMTPServer(smtp_server_options);
  smtp_server.listen(25, undefined, () => {
    console.log("SMTP Server startad på port 25");
  });
  smtp_server.on("error", (error) => {
    console.log(error);
  });
}
