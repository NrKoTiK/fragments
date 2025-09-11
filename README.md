# fragments

BTI API Server repo

First do "npm run lint" to run the ESlint tool to catch any errors early on. Then do npm start to start the actual server.

For Debugging if using VSc then go to VSc Debug mode and run via nodejs (It will say some like "Run Script: start")

If using curl.exe go to terminal in VSc run "npm run debug" then open powershell and run your curl command which is "curl.exe localhost:8080". You would get a display in the VSc Terminal.

If you want a nice format for curl.exe use this command: "curl.exe localhost:8080 | jq"

Git Commands:

git status - understand the status of the repo

git add - Allows to add modded files and docs (DO NOT BE IMPLICIT ALWAYS TYPE THE FILE NAMES EXPLICITLY).

git commit -m - Allows to commit into repo with a little message to help understand what was committed.

git push origin main - Pushes the changes to the main repo on github
