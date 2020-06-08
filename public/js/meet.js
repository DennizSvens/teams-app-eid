var socket;

function initiateRequest(method) {
    socket.emit(method, { meeting: $("#meetingId").val() });
    Swal.fire({
      imageUrl: "/public/ajax-loader.gif",
      title: "Skickar legitimeringsbegäran..",
      heightAuto: false,
      showConfirmButton: false,
      showCancelButton: false
    });
}

function initSockets() {
    socket = io.connect();

    socket.on("authenticationStatus", data => {
        
        if (data.status === 'initialized') {
          Swal.update({
            title: "Skickar legitimeringsbegäran.."
          });            
        } else if (data.status==='error') {
            switch (data.code) {
                case "cancelled_by_user": {
                  Swal.close();
                  Swal.fire({
                    html: "Du nekade eller avbröt.",
                    title: "Försök igen!",
                    icon: "error",
                    heightAuto: false        
                  });
                  break;
                }
                case "expired_transaction": {
                  Swal.close();
                  Swal.fire({
                    html: "Legitimering misslyckades",
                    title: "Tiden för legitimering gick ut.",
                    icon: "error",
                    heightAuto: false
                  });
                  break;
                }
                default: {
                  Swal.close();
                  Swal.fire({
                    title: "Ett fel uppstod",
                    html: 'Ett internt fel uppstod.',
                    icon: "error",
                    heightAuto: false
                    });
                  break;
                }
            }            
        } else if (data.status==='pending') {
            switch (data.status) {
                case "pending_notdelivered": {
                  Swal.update({
                    title: "Starta e-legitimations appen.."
                  });
                }
                case "pending_delivered": {
                  Swal.update({
                    title: "Starta e-legitimations appen.."
                  });
                  break;
                }
                case "pending_user_in_app": {
                  Swal.update({
                    title: "Authenticera dig i appen.."
                  });
                  break;
                }
            }            
        } else {
            Swal.close();
            Swal.fire({
                     heightAuto: false,        
                     title: 'Välkommen!',
                     text: undefined,
                     html: 'Du har bekräftat din identitet!<br/><br/><a href="'+data.joinUrl+'">Klicka här för att ansluta till mötet.</a>',
                     icon: 'success',
                     showCancelButton: false,
                     showConfirmButton: false,
                     imageUrl: undefined
            }); 
        }
            
       
    });
}

initSockets();


