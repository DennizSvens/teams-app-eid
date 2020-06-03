var socket;
var teamsContext;
var initTimeout;

function initiateRequest(method) {
  var ssn = valfor.personalidnum($("#inputSSN").val(), valfor.NBR_DIGITS_12);

  if (!ssn) {
    Swal.fire({
      icon: "error",
      title: "Felaktigt personnummer",
      heightAuto: false,
      html:
        "Du måste ange korrekt personnummer.<br/>Använd formatet ÅÅÅÅMMDDNNNN"
    });
  } else {
    socket.emit(method, { ssn: $("#inputSSN").val() });
    Swal.fire({
      imageUrl: "/public/ajax-loader.gif",
      title: "Skickar legitimeringsbegäran..",
      heightAuto: false,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "Avbryt"
    });
  }
}

function initSockets() {
    socket = io.connect();

    socket.on("meetingCreated", data => {
        calendar.refetchEvents();
        Swal.fire({
            title: "Mötet skapat!",
            html: `Startar <b>${data.START}</b> <br/>med <b>${data.NAME}</b>`,
            icon: "success",
            heightAuto: false
        });                
    });
    
    socket.on("calendarUpdate", data => {
        calendar.refetchEvents();
    });    
    
    socket.on("tokenAuthentication", data => {
        microsoftTeams.appInitialization.notifySuccess();
        switch(data.STATUS) {
            case "ELEVATION_NEEDED": {
                    microsoftTeams.authentication.authenticate({
                        url: window.location.origin + "/login?init=true",
                        width: 600,
                        height: 535,
                        successCallback: function (result) {
                            //Yay!
                        },
                        failureCallback: function (reason) {
                            // We always get CancelledByUser for some strange reason. So just ignore and play like we did it!
                            //Swal.fire({
                            //    icon: 'info',
                            //    title: 'Applikationen är blockerad.',
                            //    html: 'Inloggningen mot Azure AD misslyckades.<br/> Kontakta IT-Helpdesk och uppge:<br/>'+reason,
                            //    heightAuto: false,
                            //    allowOutsideClick: false,
                            //    showCancelButton: false,
                            //    showConfirmButton: false,
                            //});
                        }
                    });
                break;
                }
            case "COMMUNICATION_ERROR": 
            case "SERVICE_ERROR": {
                Swal.fire({
                    icon: 'info',
                    title: 'Applikationen är blockerad.',
                    html: 'Inloggningen mot Azure AD misslyckades.<br/> Kontakta IT-Helpdesk och uppge:<br/>'+data.details,
                    heightAuto: false,
                    allowOutsideClick: false,
                    showCancelButton: false,
                    showConfirmButton: false,
                });
                break;
            }
            case "SUCCESS": {
                break;
            }
        }     
    });

    socket.on("authenticationStatus", data => {
        switch (data.STATUS) {
            case "COMPLETED": {
              Swal.close();
              Swal.fire({
                title: "Legitimerad!",
                html: `<b>${data.DISPLAY_NAME}</b> har legitimerat sig!`,
                icon: "success",
                heightAuto: false
              });
              break;
            }
            case "INITIALIZED": {
              Swal.update({
                title: "Skickar legitimeringsbegäran.."
              });
              break;
            }
            case "PENDING_NO_USER": {
              Swal.update({
                title: "Be användaren starta appen.."
              });
              break;
            }
            case "PENDING_DELIVERED": {
              Swal.update({
                title: "Mottagaren har startat appen.."
              });
              break;
            }
            case "PENDING": {
              Swal.update({
                title: "Väntar på användaren.."
              });
              break;
            }
            case "USER_DECLINED": {
              Swal.close();
              Swal.fire({
                html: "Personen nekade eller avbröt legitimeringen.",
                title: "Försök igen!",
                icon: "error",
                heightAuto: false        
              });
              break;
            }
            case "EXPIRED": {
              Swal.close();
              Swal.fire({
                html: "Legitimering misslyckades",
                title: "Tiden för legitimering gick ut",
                icon: "error",
                heightAuto: false
              });
              break;
            }
            case "TIMEOUT": {
              Swal.close();
              Swal.fire({
                html: "Legitimering misslyckades",
                title: "Tiden för legitimering gick ut",
                icon: "error",
                heightAuto: false
              });
              break;
            }
            case "ERROR": {
              Swal.close();
              Swal.fire({
                title: "Ett fel uppstod",
                html: data.MESSAGE,
                icon: "error",
                heightAuto: false
                });
              break;
            }
        }
    });
}

function setTheme(theme) {
    if (theme) {
        // Possible values for theme: 'default', 'light', 'dark' and 'contrast'
        document.body.className = 'theme-' + (theme === 'default' ? 'light' : theme);
        
        if (theme === 'default' || theme === 'light' ) {
            $('#appTheme').attr('href', '/public/css/themes/pulse/bootstrap.min.css');
        } else if ( theme === 'contrast' ) {
            $('#appTheme').attr('href', '/public/css/themes/darkly/bootstrap.min.css');
        } else {
            $('#appTheme').attr('href', '/public/css/themes/darkly/bootstrap.min.css');
        }
    }
} 

function blockingAuthError(error) {
  Swal.fire({
    icon: 'error',
    title: 'Applikationen är blockerad.',
    html: 'Inloggningen mot Azure AD misslyckades.<br/> Kontakta IT-Helpdesk och uppge:<br/>'+error,
    allowOutsideClick: false,
    heightAuto: false,
    showCancelButton: false,
    showConfirmButton: false
  });
}

function initalizationUnblocker(callback) {
    window.clearTimeout(initTimeout);
    Swal.close();
}

function initalizationBlocker() {
    Swal.fire({
        icon: 'info',
        title: 'Applikationen är blockerad.',
        html: 'Applikationen kommer öppnas när<br/>initiering mot Teams är klar.',
        allowOutsideClick: false,
        showCancelButton: false,
        showConfirmButton: false,
        heightAuto: false,
        timerProgressBar: true,
        onBeforeOpen: () => {
            Swal.showLoading();
        }        
    });
}    

var authTokenRequest = {
    successCallback: function(result) {
        initSockets();
        socket.emit('registerToken', { token: result });
    },
    failureCallback: function(error) {
        blockingAuthError(error);
        microsoftTeams.appInitialization.notifySuccess();
    },
};

function initializeApp(teamsMode,blockCallback,unblockCallback) {
    

    if (teamsMode) {
        initTimeout = setTimeout(initalizationBlocker,5000);
        blockCallback();

        microsoftTeams.initialize(() => {
            initalizationUnblocker();
            unblockCallback();
        });

        microsoftTeams.getContext(function (context) {
            if (context && context.theme) {
                teamsContext = context;
                setTheme(context.theme);
            }
        });

        microsoftTeams.registerOnThemeChangeHandler(function (theme) {
            setTheme(theme);
        });

        microsoftTeams.authentication.getAuthToken(authTokenRequest);    
    } else {
        initSockets();
    }
}



