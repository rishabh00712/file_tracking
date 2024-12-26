import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import session from "express-session";

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false,maxAge:180000}
}));


const db = new pg.Client({
 user: "postgres", 
  host: "localhost",
  database: "password",
  password: "rishabh123",
  port: 5432,
});
db.connect();

app.get("/", (req, res) => {
  res.render("signin.ejs");
});

app.get("/signin", (req, res) => {
  res.render("signin.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.post("/signup", async (req, res) => {
  const name=req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      console.log("Email already exists. Try logging in.");
      res.render("signin.ejs",{
        error:"Email already exists, Try logging in."
      });
    } else {
      //hashing the password and saving it in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          res.render("signup.ejs",{
            error:"Something is Wrong Please Try Again Later"
          });
        } else {
          console.log("Hashed Password:", hash);
          // Generate a 5-digit OTP
          const otp = Math.floor(10000 + Math.random() * 90000);

           // Send OTP to user via email using nodemailer
           const transporter = nodemailer.createTransport({
            service: 'gmail', // Or any email service
            secure: true,
            port:465,
            auth: {
              user: 'rishabhgarai7@gmail.com',
              pass: 'xgabndbrcfwliisj' // Use environment variables for production
            }
          });
          //sending otp thrugh mail
          const mailOptions = {
            from: 'rishabhgarai7@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}`
          };

          // Send the OTP email
          transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
              console.log('Error sending OTP:', error);
              return res.render("signup.ejs", {
                error: "Failed to send OTP. Please try again later."
              });
            } else {
              console.log('OTP sent: ' + info.response);
              // Store the OTP in the session (or use any other temporary storage)
              req.session.otp = otp;
              req.session.user = { name, email, password: hash };

              // Render the OTP input page
              return res.render("otp_req.ejs", {
                message: "Please enter the OTP sent to your email."
              });
            }
          });
        }
      });
    }
  } catch (err) {
    console.log("Error in signup:", err);
    return res.render("signup.ejs", {
      error: "Something went wrong. Please try again later."
    });
  }
});

app.post("/verify-otp", async (req, res) => {
  const enteredOtp = req.body.otp;
  const sessionOtp = req.session.otp;
  const user = req.session.user;

  // Check if OTP is valid
  if (enteredOtp == sessionOtp) {
    // Save user to the database after OTP verification
    try {
      await db.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [
        user.name, user.email, user.password
      ]);
      console.log("User registered successfully!");

      // Clear OTP from session after successful verification
      req.session.otp = null;

      // Redirect to a success page
      return res.render("file_info.ejs", {
        successMessage: "User registered successfully!"
      });
    } catch (err) {
      console.error("Database error:", err);
      return res.render("signup.ejs", {
        error: "Something went wrong. Please try again later."
      });
    }
  } else {
    console.log("Invalid OTP entered.");
    return res.render("otp.ejs", {
      message: "Invalid OTP. Please try again."
    });
  }
});


app.post("/signin", async (req, res) => {
  const email = req.body.email;
  const loginPassword = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      //verifying the password
      bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          res.render("signin.ejs",{
            error:"Something is Wrong Please Try Again Later"
          });
        } else {
          if (result) {
            res.render("file_info.ejs");
          } else {
            res.render("signin.ejs",{
              error:"Your Password is Wrong Try agian."
            });
          }
        }
      });
    } else {
      res.render("signin.ejs",{
        error:"Your Email is Wrong Try agian."
      });
    }
  } catch (err) {
    res.render("signin.ejs",{
      error:"Something is Wrong Please Try Again Later"
    });
    console.log(err);
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });