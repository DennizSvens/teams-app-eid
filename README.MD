Botkyrka EID Teams App
======================
[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2FDennizSvens%2Fteams-app-eid%2Fmaster%2Fazuredeploy.json)

* Skapad av Denniz Svens / Liminity AB för Botkyrka Kommun
* Tillägg för Freja eID, Svensk e-Identitet samt Azure AD och Microsoft Teamsintegration av Daniel Sörlöv
* UI/Test av Erik Olsson

Webbapplikation för att legitimera medborgare tänkt att integreras i Teams

# Installera i lokal testmiljö

## Krav för att starta webappen lokalt på datorn

- NodeJS https://nodejs.org/en/download/
- NPM (följer med NodeJS)

## Krav för att legitimera mot testmiljön (test.env)

Du måste ha tillgång till en eller flera legitimeringstjänster, just nu stöjds dessa

* BankID via [CGI/Funktionstjänster](https://doc.funktionstjanster.se/#Utgivare/BankID/)
* BankID och Freja eID via [GrandID](https://e-identitet.se/auth/integrationsmetoder/grandid-api/) (Svensk e-Identitet)
* Freja eID direkt via deras [Rest API tjänst](https://org.frejaeid.com/for-utvecklare/)

## Skapa testidentiteter

BankID från Funktionstjänster samt Freja eID REST API är föraktiverade med generiska testnycklar i respektive testmiljöer och kan enkelt testas omgående genom att skapa testidentiter enligt nedan. För GrandID måste ni kontakta Svensk e-Identitet för att beställa testnycklar och därefter testas det mot skarp legitimeringsmiljö.

### Bank ID
1. Gå till https://www.bankid.com/bankid-i-dina-tjanster/rp-info och ladda ner testversion av av bankid för Android.
2. Gå till https://demo.bankid.com/ och logga in med ditt riktiga Bank ID
3. När du är inloggad väljer du "Issue BankID for Test" och följer instruktionerna.

### Freja eID
Gå till https://frejaeid.com/test-instructions/Freja%20eID%20Relying%20Party%20Documentation%20-%20Testing%20instructions.html och följ instruktionerna.

## Guide för att starta webappen lokalt

1. Gå in i mappen där projektet ligger med CMD/Powershell
2. Skriv: `npm install`
3. Döp om filen test.env till .env (ställ in variablerna i filen för att anpassa tjänsterna)
5. Starta sedan appen med `npm start`
6. Gå till webbläsaren och skriv in http://localhost:3000

## Installera i produktionsmiljö (Azure)

### Krav för att starta webappen i produktionsmiljö

- Azure prenumeration

### Guide för att starta webappen i produktionsmiljö

1. Skapa en Azure App Service
2. Skapa en Azure Web App som kör Linux med NodeJS 12.04
3. Konfigurera miljö/environment-variabler för WebAppen så att dom innehåller samma information som .env/test.env. Värdena måste uppdateras mot era produktions nycklar och endpoints för att fungera mot riktiga miljöerna.
4. Deploya webbappen till Azure med VSCode https://docs.microsoft.com/en-us/azure/javascript/tutorial-vscode-azure-app-service-node-01?tabs=bash

# Skapa Teams app för webbappen

Teamsintegrationen ställer lite mer krav på anpassning.

Ställ värdet TEAMS_INTEGRATED och USE_SSL till true i .env och ändra sedan inställningarna för SSL nyckel och certifikat samt sätt AAD_TENANT_NAME. Tenantnamn anges med bara det som står före onmicrosoft.com, dvs om din tenant heter kommun.onmicrosoft.com anger du bara kommun i fältet.

Slutligen rekomenderar vi också att du byter ut COOKIE_SECRET till en egen fras (kan vara precis vad du vill).

### Skapa ett app-id
1. Gå till https://www.uuidgenerator.net/
2. Kopiera id:t som skapades och använd som id för teamsappen

### Skapa app för Azure AD
1. Gå till https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. Klicka på 'Ny registrering'
* Ange ett namn du vill att din app skall visas som (Rekomenderas: Legitimering)
* Kontotyper som skall stödjas: Konton i valfri organisationskatalog (valfri Azure AD-katalog – flera klientorganisationer)
* Omdirigerings-URI: Webben, och sökvägen till din app inkl port och login (ex https://hej.com:3000/login
* Spara
3. Kopiera Program-ID till .env (AADAPP_CLIENT_ID)
4. Gå till fliken 'Certifikat och hemligheter'
* Skapa en ny klienthemlighet, med obegränsad utgånstid.
* Kopiera hemligheten till .env (AADAPP_CLIENT_SECRET)
5. Under 'API-behörigheter' ange för 'Microsoft Graph':
* offline_access
* openid
* profile
* User.Read
* User.Read.All
* Mail.Send
* Mail.Send.Shared
* Mail.ReadWrite
* Mail.ReadWrite.Shared
* Calendars.ReadWrite
* Calendars.ReadWrite.Shared
* OnlineMeetings.ReadWrite
* BookingsAppointment.ReadWrite.All
6. Under 'Exponera ett API' ange 'URI för program-ID'
* Skall vara api://publikurl:port/appid som du genererade för teamsappen (ex: api://myserver.com:3000/34dc9891-6a50-41a4-8e5c-acd9812b757c)
7. Under 'Exponera ett API' skapa en ny omfattning
* Omfattningsnamn: access_as_user
* Vem som kan ge medgivande: Administratörer och användare
* Beskrivningsrutorna fyller du med vägledande text som kommer visas för användaren/administratören vid medgivande till appen. Observera att du måste fylla text i alla rutorna. Även de frivilliga.
* Region: Aktiverad
8. Under 'Exponera ett API' lägg till Auktoriserade klientprogram som skall vara aktiva för ovanstående omfattning.
* KlientID 5e3ce6c0-2b1f-4285-8d4b-75ee78787346
* KlientID 1fec8e78-bce4-4aaf-ab1b-5451cc387264

### Skapa paket för Teams
Använd Teams App Studio för att skapa ett app-paket. Du hittar Teams App Studio i Teams. Exempelikoner finns i mappen resources. 

1. Under App details se till att ange App ID till id:t som genererades för teamsappen
2. Fyll i övriga krävda uppgifter
3. Under App details i sektionen Advanced se till att rutan Loading indicator är ikryssad
4. Under Tabs Skapa en teamstab för team och gruppchattar med config address https://dinserver.se:3000/config
5. Under Tabs skapa en personlig tab med namn 'Legitimering' och adress https://dinserver.se:3000/identify, ange inte website URL
5. Under Tabs skapa en personlig tab med namn 'Kalender' och adress https://dinserver.se:3000/calendar, ange inte website URL
6. Under Domains and Permissions ange AAD appID som du fick när du skapade AAD-appen
7. Under Domains and Permissions ange Single-Sign-On url till URI för program-ID från AAD-appen
8. Deploy!

# TODO

## Saker som funderas på...
- Loggning?
- Uppgradera redan bokade möten till säkra möten
- Begränsa när en kund kan logga in via säkra länken
- Kunden själv makulera mötet?
- Boka möten via bookings (men inte som online för då får ju individen en direktlänk!)



