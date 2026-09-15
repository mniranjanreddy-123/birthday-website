const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((error) => console.log("MongoDB connection error:", error));
const PORT = 3000;

// Temporary admin password
const ADMIN_PASSWORD = "Niranjan";

// Read form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Temporary storage for user details
const userDetailsSchema = new mongoose.Schema({
    name: String,
    nickname: String,
    dob: String,
    favouriteColour: String,
    myFavouriteColour: String
});

const UserDetails = mongoose.model("UserDetails", userDetailsSchema);

// Receive form details
app.post("/save-details", async (req, res) => {
    try {
        await UserDetails.create(req.body);

        res.redirect("/first.html");
    } catch (error) {
        console.log("Error saving user details:", error);
        res.send("Could not save user details.");
    }
});

// Send user details to admin dashboard
app.get("/api/user-details", async (req, res) => {
    try {
        const details = await UserDetails.find();
        res.json(details);
    } catch (error) {
        console.log("Error loading user details:", error);
        res.status(500).json({
            message: "Could not load user details"
        });
    }
});

// Enable sessions
app.use(
    session({
        secret: "birthday-secret-key",
        resave: false,
        saveUninitialized: false
    })
);

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Main website
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "form.html"));
});

// Show login page
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Process login
app.post("/login", (req, res) => {
    const password = req.body.password;

    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect("/admin");
    } else {
        res.send("Incorrect password. Please go back and try again.");
    }
});

// Protect admin dashboard
app.get("/admin", (req, res) => {
    if (req.session.isAdmin) {
        res.sendFile(path.join(__dirname, "public", "admin.html"));
    } else {
        res.redirect("/login");
    }
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});
// Temporary storage for proposal responses
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


// Receive Yes/No responses
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
// Send responses to the admin dashboard
// Send responses only to logged-in admins
app.get("/api/responses", async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({
            message: "Access denied"
        });
    }

    try {
        const responses = await ProposalResponse.find();
        res.json(responses);
    } catch (error) {
        console.log("Error loading proposal responses:", error);

        res.status(500).json({
            message: "Could not load responses"
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
