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
        title: "Skickar legitimeringsbegäran..",
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
   initiateRequest('initAuthenticationFTBankID');
  } else {
   initiateRequest('initAuthenticationFrejaAPI');
  }
  });
});

$('#submitbankid').on('click', function() {
   initiateRequest('initAuthenticationFTBankID');
});
$('#submitfrejaeid').on('click', function() {
   initiateRequest('initAuthenticationFrejaAPI');
});

var socket = io.connect();
socket.emit('getCapabilities');

socket.on("capList", data => {    
    Object.keys(data).forEach(function(key) {
        $('#buttonHolder').append('<button class="btn btn-lg btn-success btn-block" id="submit_'+key+'" type="button">Legitimera med '+data[key]+'</button>').trigger('create');        
        $('#submit_'+key).on('click', function() {
           initiateRequest(key);
        });
    });    
});

socket.on("authenticationStatus", data => {
  switch (data.STATUS) {
    case "COMPLETE": {
      Swal.close();
      Swal.fire("Legitimerad!",`<b>${data.DISPLAY_NAME}</b> har legitimerat sig!`,"success");
      break;
    }
    case "INITIALIZED":
    {
      Swal.update({
        title: "Skickar legitimeringsbegäran.."
      });
      break;
    }    
    case "PENDING_NO_USER":
    {
      Swal.update({
        title: "Be användaren starta appen.."
      });
      break;
    }    
    case "PENDING_DELIVERED":
    {
      Swal.update({
        title: "Mottagaren har startat appen.."
      });
      break;
    }    
    case "PENDING":
    {
      Swal.update({
        title: "Väntar på användaren.."
      });
      break;
    }    
    case "USER_DECLINED":
    {
      Swal.close();
      Swal.fire("Personen nekade eller avbröt legitimeringen.", "Försök igen!", "error");
      break;
    }    
    case "EXPIRED": {
      Swal.close();
      Swal.fire("Legitimering misslyckades","Tiden för legitimering gick ut","error");
      break;
    }
    case "TIMEOUT": {
      Swal.close();
      Swal.fire("Legitimering misslyckades","Tiden för legitimering gick ut","error");
      break;
    }
    case "ERROR": {
      Swal.close();
      Swal.fire("Ett fel uppstod",data.MESSAGE,"error");
      break;
    }
  }
});
