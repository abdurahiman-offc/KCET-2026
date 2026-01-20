const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
// const open = require('open'); // REMOVED: Caused ESM error
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for JSON body parsing
app.use(express.json());

// Google Sheets API setup
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// 🔹 Start OAuth or reuse token
async function authorize() {
    // Dynamic import for open
    let open;
    try {
        open = (await import('open')).default;
    } catch (err) {
        // console.error('Failed to import open:', err);
    }

    // 1. Check Environment Variable (for Vercel)
    if (process.env.GOOGLE_ACCESS_TOKEN) {
        try {
            const token = JSON.parse(process.env.GOOGLE_ACCESS_TOKEN);
            oAuth2Client.setCredentials(token);
            console.log('✅ Google Sheets authenticated via GOOGLE_ACCESS_TOKEN env var.');
            return;
        } catch (err) {
            console.error('❌ Failed to parse GOOGLE_ACCESS_TOKEN:', err);
        }
    }

    // 2. If token already exists, reuse it
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
            oAuth2Client.setCredentials(token);
            console.log('✅ Google Sheets authenticated with existing token.');

            // Open the app automatically
            if (open && !process.env.VERCEL) await open(`http://localhost:${process.env.PORT || 3000}`);
        } catch (err) {
            console.error('Error reading token file, please re-authenticate.');
        }
        return;
    }

    // Only open browser if we have client ID
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.warn('⚠️ GOOGLE_CLIENT_ID not set. Skipping auto-auth.');
        return;
    }

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('🔑 Opening browser for Google login...');
    if (open) {
        try {
            await open(authUrl);
        } catch (err) {
            console.log('Failed to open browser automatically. Please visit:', authUrl);
        }
    }
}

// 🔹 OAuth callback route
app.get('/oauth2callback', async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            return res.status(400).send('No code provided');
        }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

        console.log('✅ OAuth2 authentication successful! Token saved.');
        // Redirect to home page
        res.redirect('/');
    } catch (err) {
        console.error('OAuth Error:', err);
        res.status(500).send('Authentication failed');
    }
});

app.post('/api/submit', async (req, res) => {
    try {
        const { name, phone } = req.body;
        const time = new Date().toLocaleString();

        console.log(`Received submission: ${name}, ${phone}`);

        if (!oAuth2Client.credentials || !oAuth2Client.credentials.access_token) {
            console.error('❌ Not authenticated with Google Sheets.');
            return res.status(500).json({ result: 'error', message: 'Server not authenticated with Google' });
        }

        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

        const spreadsheetId = process.env.SPREADSHEET_ID;
        const range = 'Sheet1!A:C';

        if (!spreadsheetId) {
            return res.status(500).json({ result: 'error', message: 'Spreadsheet ID not configured' });
        }

        const values = [
            [name, phone, time]
        ];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: values,
            },
        });

        console.log('Row appended successfully:', response.data.updates);
        res.json({ result: 'success' });

    } catch (error) {
        console.error('Error appending to sheet:', error);
        res.status(500).json({ result: 'error', message: 'Failed to submit data: ' + error.message });
    }
});

app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    await authorize();
});
