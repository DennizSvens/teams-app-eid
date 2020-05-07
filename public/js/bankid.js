function initiateBankIdRequest() {
  socket.emit("startBankIdAuthentication", { ssn: $("#inputSSN")[0].value });
  Swal.fire({
    title: "Väntar på legitimering!",
    timerProgressBar: true,
    allowOutsideClick: false,
    onBeforeOpen: () => {
      Swal.showLoading();
    }
  });
}
$("#EidAuthForm").submit(function(e) {
  e.preventDefault();
  initiateBankIdRequest();
});
var socket = io.connect();
socket.on("bankIDResponse", data => {
  switch (data.STATUS) {
    case "COMPLETE": {
      Swal.close();
      Swal.fire(
        "Legitimerad!",
        `<b>${data.BankIDName}</b> har legitimerat sig!`,
        "success"
      );
      break;
    }
    case "USER_CANCEL": {
      Swal.close();
      Swal.fire("Personen avbröt legitimeringen", "Försök igen!", "error");
      break;
    }
    case "NO_ORDER_REF": {
      Swal.close();
      Swal.fire(
        "Oväntat fel",
        "Detta kan bero på att personen redan har en autentisering initierad",
        "error"
      );
      break;
    }
    case "EXPIRED_TRANSACTION": {
      Swal.close();
      Swal.fire(
        "Legitimering misslyckades",
        "Tiden för legitimering gick ut",
        "error"
      );
      break;
    }
    default: {
      Swal.close();
      Swal.fire(
        "Oväntat fel",
        "Ett oväntat fel inträffade, kontakta IT-enheten om detta problem kvarstår",
        "error"
      );
      break;
    }
  }
});
