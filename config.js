const dotenv = require("dotenv");
const path = require("path");
dotenv.config();
module.exports = {
  endpoint: process.env.REQUEST_ENDPOINT,
  policy: process.env.POLICY,
  rpDisplayName: process.env.RP_DISPLAYNAME,
  port: process.env.PORT,
  caPath: path.join(__dirname, process.env.CA_NAME)
};
