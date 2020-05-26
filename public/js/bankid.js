function initiateRequest(method) {
  var ssn = valfor.personalidnum($("#inputSSN").val(), valfor.NBR_DIGITS_12);
  
  if (!ssn) {
    Swal.fire({
        icon: 'error',
        title: 'Felaktigt personnummer',
        html: 'Du måste ange korrekt personnummer.<br/>Använd formatet ÅÅÅÅMMDDNNNN'
    });	  
  } else {
      socket.emit(method, { ssn: $("#inputSSN")[0].value });
      Swal.fire({
        imageWidth: 80,
        imageHeight: 80,
        imageUrl: '/public/ajax-loader.gif',
        title: "Väntar på legitimering!",
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Avbryt"
      });
  }
}

$("#EidAuthForm").submit(function(e) {
  e.preventDefault();   
  Swal.fire({
        icon: 'question',
        title: 'Hur vill du legitimera?',
        cancelButtonText: 'Freja eID',
        confirmButtonText: 'Bank ID',
        showCancelButton: true
  }).then((result) => {
  if (result.value) {
   initiateRequest('startBankIdAuthentication');
  } else {
   initiateRequest('initFrejaAuthentication');
  }
  });
});

$('#submitbankid').on('click', function() {
   initiateRequest('startBankIdAuthentication');
});
$('#submitfrejaeid').on('click', function() {
   initiateRequest('initFrejaAuthentication');
});

var socket = io.connect();
socket.on("frejaAuthStatus", data => {
  switch (data.STATUS) {
    case "COMPLETE": {
      Swal.close();
      Swal.fire("Legitimerad!",`<b>${data.SUBJECT}</b> har legitimerat sig!`,"success");
      break;
    }
    case "STARTED":
    {
      Swal.update({
        title: "Be användaren starta appen.."
      });
      break;
    }    
    case "DELIVERED_TO_MOBILE":
    {
      Swal.update({
        title: "Mottagaren har startat appen.."
      });
      break;
    }    
    case "CANCELED":
    case "RP_CANCELED":
    {
      Swal.close();
      Swal.fire("Personen nekade eller avbröt legitimeringen.", "Försök igen!", "error");
      break;
    }    
    case "REJECTED":
    {
      Swal.close();
      Swal.fire("Personen har redan en pågående legitimering.", "Försök igen!", "error");
      break;
    }
    case "API_ERROR": {
      Swal.close();
      Swal.fire("Internt fel","Ett kommunikationsfel uppstod, försök igen.","error");
      break;
    }
    case "EXPIRED": {
      Swal.close();
      Swal.fire("Legitimering misslyckades","Tiden för legitimering gick ut","error");
      break;
    }
    default: {
      Swal.close();
      Swal.fire("Oväntat fel","Ett oväntat fel inträffade, kontakta IT-enheten om detta problem kvarstår","error"
      );
      break;
    }
  }
});
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
