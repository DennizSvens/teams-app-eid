# Botkyrka EID Teams App

Skapad av Denniz Svens / Liminity AB för Botkyrka Kommun

Tillägg för Freja eID av Daniel Sörlöv

Webbapplikation för att legitimera medborgare tänkt att integreras i Teams

# Installera i lokal testmiljö

### Krav för att starta webappen lokalt på datorn

- NodeJS https://nodejs.org/en/download/
- NPM (följer med NodeJS)

### Krav för att legitimera mot testmiljön (test.env)
Du måste ha tillgång till en legitimeringstjänst, just nu stöjds dessa två
* BankID via Funktionstjänster (CGI): https://doc.funktionstjanster.se/#Utgivare/BankID/
* Freja eID direkt via deras API: https://org.frejaeid.com/for-utvecklare/

unktionstjänster från CGI är föraktiverad för att denna testmiljö inte kräver unika/egna inloggningsnycklar, men du kan enkelt aktivera exempelvis Freja eID genom att ställa in det i konfigurationen (se nedan).

### Guide för att starta webappen lokalt

1. Gå in i mappen där projektet ligger med CMD/Powershell
2. Skriv: `npm install`
3. Döp om filen test.env till .env (ställ in variablerna i filen för att anpassa tjänsterna)
5. Starta sedan appen med `npm start`
6. Gå till webbläsaren och skriv in http://localhost:3000

# Installera i produktionsmiljö (Azure)

### Krav för att starta webappen i produktionsmiljö

- Azure prenumeration

### Guide för att starta webappen i produktionsmiljö

1. Skapa en Azure App Service
2. Skapa en Azure Web App som kör Linux med NodeJS 12.04
3. Konfigurera miljö/environment-variabler för WebAppen så att dom innehåller samma information som .env/test.env (förutom PORT) - DISPLAY_NAME, POLICY, REQUEST_ENDPOINT måste uppdateras mot era produktions API-nycklar och endpoint för att fungera mot riktiga BankID.
4. Deploya webbappen till Azure med VSCode https://docs.microsoft.com/en-us/azure/javascript/tutorial-vscode-azure-app-service-node-01?tabs=bash

### Skapa Teams app för webappen som personlig flik

Använd Teams App Studio och följ denna guide:
https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/building-an-app
