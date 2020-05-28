Botkyrka EID Teams App
======================
[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2FDennizSvens%2Fteams-app-eid%2Fmaster%2Fazuredeploy.json)

Skapad av Denniz Svens / Liminity AB för Botkyrka Kommun
Tillägg för Freja eID och Svensk e-Identitet av Daniel Sörlöv

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

# Skapa Teams app för webappen som personlig flik

Använd Teams App Studio och följ denna guide:
https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/building-an-app
