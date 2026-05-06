const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

// Load your downloaded credentials
const credentials = require('./credentials.json');
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// The permissions NEXUS needs
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/tasks'
];

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial: Gives us the refresh token!
    scope: SCOPES,
});

console.log('🔗 [NEXUS AUTH] Click this link to authorize the OS:');
console.log(authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\n🔑 Paste the authorization code here: ', async (code) => {
    try {
        const { tokens } = await oAuth2Client.getToken(code);
        fs.writeFileSync('./token.json', JSON.stringify(tokens));
        console.log('✅ Token saved to token.json! NEXUS now has permanent Google access.');
    } catch (err) {
        console.error('Error retrieving token', err);
    }
    rl.close();
});