import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import { render } from "ejs";

var gobalOtp;
let gobalName ;
let  hashPassword;
let  gobalEmail;
let gobalDept;

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

app.use(
  session({
    secret: "TOPSECRETWORD",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 60 * 24 * 14},
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
 user: "postgres", 
  host: "localhost",
  database: "password",
  password: "rishabh123",
  port: 5432,
});
db.connect();

const dbfile = new pg.Client({
  user: "postgres", 
   host: "localhost",
   database: "file_track",
   password: "rishabh123",
   port: 5432,
 });
 dbfile.connect();

 app.get("/", (req, res) => {
   res.redirect("/signin");
});

app.get("/signin", (req, res) => {
  res.render("signin.ejs");
});
app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:3000`);
});


app.post("/signup", async (req, res) => {
  const name=req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const department=req.body.dept;
  console.log(name)
  console.log(email)
  console.log(password)
  console.log(department)
  try {
    const checkResult = await db.query("SELECT * FROM officers WHERE email = $1", [
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
          console.log(`The otp is ${otp}`);

           // Send OTP to user via email using nodemailer
           const transporter = nodemailer.createTransport({
            service: 'gmail', // Or any email service
            secure: true,
            port:465,
            auth: {
              user: 'rishabhgarai7@gmail.com',
              pass: 'pgaqlnlxbsqgynjm' // Use environment variables for production
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
                error: "Failed to Send OTP. Please Try Again Later."
              });
            } else {
              console.log('OTP sent: ' + info.response);
              // Store the OTP in the session (or use any other temporary storage)
              gobalOtp=otp;
              gobalName=name;
              gobalEmail=email;
              hashPassword=hash;
              gobalDept=department;

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
  const sessionOtp = gobalOtp;
  const user_email = gobalEmail;
  const user_name = gobalName;
  const user_pass = hashPassword;
  const user_dept = gobalDept;
  
  console.log(`the session otp is ${sessionOtp}`);
  console.log(`the entered otp is ${enteredOtp}`)
  // Check if OTP is valid
  if (enteredOtp == sessionOtp) {
    // Save user to the database after OTP verification
    try {
      await dbfile.query("INSERT INTO members_req (dept_name,members_name, members_email, members_pass) VALUES ($1, $2, $3,$4)", [
        user_dept,user_name,user_email,user_pass,
      ]);
      console.log("User registered successfully!");

      // Clear OTP from after successful verification
      gobalEmail=null;
      gobalName=null;
      gobalOtp=0;
      hashPassword=null;
      gobalDept=null;
      // Redirect to a success page
      return res.render("parmission_page.ejs", {
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
    return res.render("otp_req.ejs", {
      error: "Invalid OTP. Please try again."
    });
  }
});

