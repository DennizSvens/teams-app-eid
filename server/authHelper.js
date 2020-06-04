var OAuth = require('oauth');
var uuid = require('uuid');
var request = require("request");

var credentials = {
  authority: 'https://login.microsoftonline.com/common',
  authorize_endpoint: '/oauth2/v2.0/authorize',
  token_endpoint: '/oauth2/v2.0/token',
  scope: 'email openid profile User.Read Calendars.ReadWrite Mail.Send'
};

module.exports = {
    getAuthUrl: function getAuthUrl(redirectUrl) {
      var authUrl = credentials.authority + credentials.authorize_endpoint +
        '?client_id=' + process.env.AADAPP_CLIENT_ID +
        '&response_type=code' +
        '&redirect_uri=' + process.env.BASE_URL+'/login' +
        '&scope=' + credentials.scope +
        '&response_mode=query' +
        '&nonce=' + uuid.v4();
        return authUrl;
    },

    getTokensFromUserToken: function getTokensFromUserToken(userToken, socket) {
        var requestOptions = {
            uri: 'https://login.microsoftonline.com/'+process.env.AAD_TENANT_NAME+'.onmicrosoft.com/oauth2/token',
            headers: { "content-type": "application/x-www-form-urlencoded" },
            form: {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: userToken,
                client_id: process.env.AADAPP_CLIENT_ID,
                client_secret: process.env.AADAPP_CLIENT_SECRET,
                resource: 'https://graph.microsoft.com',
                requested_token_use: 'on_behalf_of',
                scope: 'email openid profile User.Read Calendars.ReadWrite Mail.Send'
                }
        };

        request.post(requestOptions, (err, response, body) => {
            if (err) {
                return socket.emit("tokenAuthentication", { STATUS: "COMMUNICATION_ERROR", DETAILS: "General API Communication Failure"});
            }
            var responseObject = JSON.parse(body);

            if (responseObject.error) {
              switch(responseObject.error) {
                case "interaction_required":
                case "invalid_grant":
                    return socket.emit("tokenAuthentication", { STATUS: "ELEVATION_NEEDED", DETAILS: responseObject.error});
                    break;
                case "invalid_request":
                    return socket.emit("tokenAuthentication", { STATUS: "SERVICE_ERROR", DETAILS: responseObject.error});
                    break;
                default:
                    return socket.emit("tokenAuthentication", { STATUS: "UNKOWN_ERROR", DETAILS: responseObject.error});
                    break;
              }
            } else {
                socket.handshake.session.access_token = responseObject.access_token;
                socket.handshake.session.refresh_token = responseObject.refresh_token;
                socket.handshake.session.isAuthenticated = true;
                socket.handshake.session.save();
                socket.emit("tokenAuthentication", { STATUS: 'SUCCESS'});
            }
        });
    },

    getApplicationToken: function getTokensFromUserToken(callback) {
        var requestOptions = {
            uri: 'https://login.microsoftonline.com/'+process.env.AAD_TENANT_NAME+'.onmicrosoft.com/oauth2/v2.0/token',
            headers: { "content-type": "application/x-www-form-urlencoded" },
            form: {
                grant_type: 'client_credentials',
                client_id: process.env.AADAPP_CLIENT_ID,
                client_secret: process.env.AADAPP_CLIENT_SECRET,
                scope: 'https://graph.microsoft.com/.default'
                }
        };

        request.post(requestOptions, (err, response, body) => {
            var responseObject = JSON.parse(body);
            callback(responseObject.access_token);
        });
    },


    getTokenFromCode: function getTokenFromCode(code, callback) {
      var OAuth2 = OAuth.OAuth2;
      var oauth2 = new OAuth2(
        process.env.AADAPP_CLIENT_ID,
        process.env.AADAPP_CLIENT_SECRET,
        credentials.authority,
        credentials.authorize_endpoint,
        credentials.token_endpoint
      );

      oauth2.getOAuthAccessToken(
        code,
        {
          grant_type: 'client_credentials',
          redirect_uri: process.env.BASE_URL+'/login',
          response_mode: 'form_post',
          scope: 'User.Read.All Calendars.Read.All'
        },
        function (e, accessToken, refreshToken) {
          callback(e, accessToken, refreshToken);
        }
      );
    },

    getTokenFromRefreshToken: function getTokenFromRefreshToken(refreshToken, callback) {
      var OAuth2 = OAuth.OAuth2;
      var oauth2 = new OAuth2(
        process.env.AADAPP_CLIENT_ID,
        process.env.AADAPP_CLIENT_SECRET,
        credentials.authority,
        credentials.authorize_endpoint,
        credentials.token_endpoint
      );

      oauth2.getOAuthAccessToken(
        refreshToken,
        {
          grant_type: 'refresh_token',
          redirect_uri: process.env.BASE_URL+'/login',
          response_mode: 'form_post',
          nonce: uuid.v4(),
          state: 'abcd'
        },
        function (e, accessToken) {
          callback(e, accessToken);
        }
      );
    },
    
    hasAccessTokenExpired: function hasAccessTokenExpired(e) {
      var expired;
      if (!e.innerError) {
        expired = false;
      } else {
        expired = e.code === 401 &&
          e.innerError.code === 'InvalidAuthenticationToken' &&
          e.innerError.message === 'Access token has expired.';
      }
      return expired;
    }
    
};
