# Botkyrka EID Teams App

Skapad av Denniz Svens / Liminity AB för Botkyrka Kommun

Webbapplikation för att legitimera medborgare med BankID.

# Installera i lokal testmiljö

### Krav för att starta webappen lokalt på datorn

- NodeJS https://nodejs.org/en/download/
- NPM (följer med NodeJS)

### Guide för att starta webappen lokalt

1. Gå in i mappen där projektet ligger med CMD/Powershell
2. Skriv: `npm install`
3. Döp om filen test.env till .env (Används för att komma åt CGIs testmiljö som är öppen för alla)
4. Starta sedan appen med `npm start`

# Installera i produktionsmiljö (Azure)

### Krav för att starta webappen i produktionsmiljö

- Azure prenumeration

### Guide för att starta webappen i produktionsmiljö

1. Skapa en Azure App Service
2. Skapa en Azure Web App som kör Linux med NodeJS 12.04
3. Konfigurera miljö/environment-variabler för WebAppen så att dom innehåller samma information som .env/test.env
4. Deploya webbappen till Azure med VSCode https://docs.microsoft.com/en-us/azure/javascript/tutorial-vscode-azure-app-service-node-01?tabs=bash

### Skapa Teams app för webappen som personlig flik

Använd Teams App Studio och följ denna guide:
https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/building-an-app
