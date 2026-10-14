
require("dotenv").config();

const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// MONGODB ATLAS CONNECTION
// ==================================================

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((error) =>
        console.log("MongoDB connection error:", error)
    );

// ==================================================
// ADMIN PASSWORD
// ==================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Niranjan";

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || "birthday-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

// ==================================================
// SERVE FRONTEND FILES
// ==================================================

app.use(express.static(path.join(__dirname, "public")));

// ==================================================
// USER DETAILS SCHEMA
// ==================================================

const userDetailsSchema = new mongoose.Schema({
    name: String,
    nickname: String,
    dob: String,
    favouriteColour: String,
    myFavouriteColour: String
});

const UserDetails = mongoose.model(
    "UserDetails",
    userDetailsSchema
);

// ==================================================
// SAVE FORM DETAILS
// ==================================================

app.post("/save-details", async (req, res) => {
    try {
        await UserDetails.create(req.body);

        res.redirect("/first.html");
    } catch (error) {
        console.log("Error saving user details:", error);

        res.status(500).send("Could not save user details.");
    }
});

// ==================================================
// GET USER DETAILS FOR ADMIN
// ==================================================

app.get("/api/user-details", async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({
            message: "Access denied"
        });
    }

    try {
        const details = await UserDetails.find().lean();

        res.json(details);
    } catch (error) {
        console.log("Error loading user details:", error);

        res.status(500).json({
            message: "Could not load user details"
        });
    }
});

// ==================================================
// PROPOSAL RESPONSES SCHEMA
// ==================================================

const proposalResponseSchema = new mongoose.Schema({
    response: String,
    time: {
        type: Date,
        default: Date.now
    }
});

const ProposalResponse = mongoose.model(
    "ProposalResponse",
    proposalResponseSchema
);

// ==================================================
// SAVE YES/NO RESPONSE
// ==================================================

app.post("/api/response", async (req, res) => {
    try {
        await ProposalResponse.create({
            response: req.body.response
        });

        res.json({
            message: "Response saved successfully"
        });
    } catch (error) {
        console.log("Error saving proposal response:", error);

        res.status(500).json({
            message: "Could not save response"
        });
    }
});

// ==================================================
// GET PROPOSAL RESPONSES FOR ADMIN
// ==================================================

app.get("/api/responses", async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({
            message: "Access denied"
        });
    }

    try {
        const responses = await ProposalResponse.find()
            .sort({ time: -1 })
            .lean();

        res.json(responses);
    } catch (error) {
        console.log("Error loading proposal responses:", error);

        res.status(500).json({
            message: "Could not load responses"
        });
    }
});

// ==================================================
// MAIN WEBSITE
// ==================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "form.html"));
});

// ==================================================
// LOGIN PAGE
// ==================================================

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ==================================================
// PROCESS ADMIN LOGIN
// ==================================================

app.post("/login", (req, res) => {
    const password = req.body.password;

    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;

        req.session.save((error) => {
            if (error) {
                console.log("Session save error:", error);

                return res.status(500).send(
                    "Could not complete login. Please try again."
                );
            }

            res.redirect("/admin");
        });
    } else {
        res.status(401).send(
            "Incorrect password. Please go back and try again."
        );
    }
});

// ==================================================
// PROTECTED ADMIN DASHBOARD
// ==================================================

app.get("/admin", (req, res) => {
    if (req.session.isAdmin) {
        return res.sendFile(
            path.join(__dirname, "public", "admin.html")
        );
    }

    res.redirect("/login");
});

// ==================================================
// LOGOUT
// ==================================================

app.get("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.log("Session destroy error:", error);

            return res.status(500).send(
                "Could not log out. Please try again."
            );
        }

        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
