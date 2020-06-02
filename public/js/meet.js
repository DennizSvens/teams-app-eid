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
        switch (data.STATUS) {
            case "COMPLETED": {
                Swal.close();
                Swal.fire({
                         heightAuto: false,        
                         title: 'Välkommen!',
                         text: undefined,
                         html: 'Du har bekräftat din identitet!<br/><br/><a href="'+data.DECORATIONS+'">Klicka här för att ansluta till mötet.</a>',
                         icon: 'success',
                         showCancelButton: false,
                         showConfirmButton: false,
                         imageUrl: undefined
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
                title: "Starta e-legitimations appen.."
              });
              break;
            }
            case "PENDING_DELIVERED": {
              Swal.update({
                title: "Authenticera dig i appen.."
              });
              break;
            }
            case "PENDING": {
              Swal.update({
                title: "Väntar.."
              });
              break;
            }
            case "USER_DECLINED": {
              Swal.close();
              Swal.fire({
                html: "Du nekade eller avbröt.",
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
                title: "Tiden för legitimering gick ut.",
                icon: "error",
                heightAuto: false
              });
              break;
            }
            case "TIMEOUT": {
              Swal.close();
              Swal.fire({
                html: "Legitimering misslyckades",
                title: "Tiden för legitimering gick ut.",
                icon: "error",
                heightAuto: false
              });
              break;
            }
            case "ERROR": {
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
    });
}

initSockets();


