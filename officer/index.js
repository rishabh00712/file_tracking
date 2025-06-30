import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import dotenv from "dotenv";
import pkg from "pg";

import signupRoutes from "./routes/signup.js";
import signinRoutes from "./routes/signin.js";
import verifyOtpRoutes from "./routes/verifyOtp.js";
import submitFile from "./routes/submitFile.js";
import passChange from "./routes/passChange.js";
import fileAddRoute from "./routes/addFilesForDean.js";
import holdFileRoute from "./routes/holdFile.js";
import addFacultyRoutes from "./routes/AddFacult.js";
import viewsFiles from "./routes/viewsFiles.js";
import viewFaculties from "./routes/facultiesSearch.js";
 // ✅ make sure this file has `export default`

dotenv.config();
const app = express();
const port = 3000;

const { Client } = pkg;

// ✅ PostgreSQL Client Setup
const connectionString = process.env.DB_URL;
const db = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for NeonDB
});

// ✅ Connect to DB
db.connect()
  .then(() => console.log("Connected to NeonDB ✅"))
  .catch((err) => console.error("Connection error ❌", err));

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "TOPSECRETWORD",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 60 * 24 * 14 }, // 14 days
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

// ✅ Routes
app.use("/", signupRoutes(db));
app.use("/", signinRoutes(db));
app.use("/", verifyOtpRoutes(db));
app.use("/", submitFile(db));
app.use("/", passChange(db));
app.use("/", holdFileRoute(db));
app.use("/", fileAddRoute(db));
app.use("/",viewsFiles(db));
app.use("/",viewFaculties(db));
app.use("/", addFacultyRoutes(db));

// ✅ Default Route
app.get("/", (req, res) => {
  res.redirect("/signin");
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
