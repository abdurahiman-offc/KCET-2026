const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Google Apps Script URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxqHpTfsd334wHPvA1vq0mwPrLGtj-S6PvWxTE6bE5TOuxFrsVMdbQFvYf0KPL4jOswfQ/exec";

// Route to handle form submission
app.post("/api/submit", async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ result: "error", message: "Name and Phone are required" });
        }

        const time = new Date().toLocaleString();

        const payload = {
            name,
            phone,
            time
        };

        console.log("Submitting to Google Sheet:", payload);

        // Send data to Google Apps Script
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        console.log("Google Sheet Response:", data);

        // Forward the response from Google Script or send a success message
        // Note: Google Apps Script Web Apps often return redirects or text/plain, so we might need to handle that.
        // Assuming the script returns JSON or we just blindly consider it success if fetch didn't throw.

        res.json({ result: "success", message: "Data forwarded to Google Sheet", upstream: data });

    } catch (error) {
        console.error("Error submitting to Google Sheet:", error);
        res.status(500).json({ result: "error", message: "Internal Server Error" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
});
