function initiateRequest(method) {
  var ssn = valfor.personalidnum($("#inputSSN").val(), valfor.NBR_DIGITS_12);

  if (!ssn) {
    Swal.fire({
      icon: "error",
      title: "Felaktigt personnummer",
      html:
        "Du måste ange korrekt personnummer.<br/>Använd formatet ÅÅÅÅMMDDNNNN"
    });
  } else {
    socket.emit(method, { ssn: $("#inputSSN")[0].value });
    Swal.fire({
      imageUrl: "/public/ajax-loader.gif",
      title: "Skickar legitimeringsbegäran..",
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "Avbryt"
    });
  }
}

var socket = io.connect();

socket.on("authenticationStatus", data => {
  console.log(data);
  switch (data.STATUS) {
    case "COMPLETED": {
      Swal.close();
      Swal.fire(
        "Legitimerad!",
        `<b>${data.DISPLAY_NAME}</b> har legitimerat sig!`,
        "success"
      );
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
      Swal.fire(
        "Personen nekade eller avbröt legitimeringen.",
        "Försök igen!",
        "error"
      );
      break;
    }
    case "EXPIRED": {
      Swal.close();
      Swal.fire(
        "Legitimering misslyckades",
        "Tiden för legitimering gick ut",
        "error"
      );
      break;
    }
    case "TIMEOUT": {
      Swal.close();
      Swal.fire(
        "Legitimering misslyckades",
        "Tiden för legitimering gick ut",
        "error"
      );
      break;
    }
    case "ERROR": {
      Swal.close();
      Swal.fire("Ett fel uppstod", data.MESSAGE, "error");
      break;
    }
  }
});
