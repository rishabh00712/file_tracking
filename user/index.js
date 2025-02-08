import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import { render } from "ejs";

let emailMap = new Map();

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
  if (req.isAuthenticated()) {
    res.redirect("/file_search")
  } else {
    res.redirect("/signin");
  }
});

app.get("/file_search", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("file_search.ejs");
  } else {
    res.redirect("/signin");
  }
});

app.get("/change_pass", (req, res) => {
  res.render("change_pass.ejs");
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
          console.log(`The otp is ${otp}`);

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
              emailMap.set(email, {
                otp: otp,
                password: hash,
                name: name,
            });
            console.log("Entry added successfully!");

              // Render the OTP input page
              return res.render("otp_req.ejs", {
                message: "Please enter the OTP sent to your email.",
                email: email
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

app.post("/verify-otp/:email", async (req, res) => {
  const user_email = req.params.email;
  const enteredOtp = req.body.otp;
  let obj = emailMap.get(user_email);
  let sended_otp;
  let user_name;
  let user_pass;
  if (obj) {
    // Method 1: Console each value directly
     sended_otp=obj.otp;
     user_name=obj.name;
     user_pass=obj.password;
  }else{
    res.render("signup.ejs",{
      error:"Something Went Wrong. Please Try Again"
    })
  }

  console.log(`the session otp is ${sended_otp}`);
  console.log(`the entered otp is ${enteredOtp}`)
  // Check if OTP is valid
  if (enteredOtp == sended_otp) {
    // Save user to the database after OTP verification
    try {
      await db.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [
        user_name,user_email,user_pass,
      ]);
      console.log("User registered successfully!");

    if (emailMap.delete(user_email)) {
      console.log("Entry deleted successfully!");
    } else {
      console.log("Email not found, nothing to delete!");
    }
      // Redirect to a success page
      return res.render("file_search.ejs", {
        successMessage: "User registered successfully!"
      });
    } catch (err) {
      console.error("Database error:", err);
      return res.render("signup.ejs", {
        error: "Something Went Wrong. Please Try Again Later."
      });
    }
  } else {
    console.log("Invalid OTP entered.");
    return res.render("otp_req.ejs", {
      error: "Invalid OTP. Please try again.",
      email:user_email
    });
  }
});

app.post("/change-pass", async(req,res)=>{
  const email = req.body.email;
  console.log(email);
  const newPassword = req.body.password;
  const againPassword=req.body.password_again;
  if(newPassword!=againPassword){
    res.render("change_pass.ejs",{
      error:"The Passwords entered do not match"
    });
  }else{
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      if (result.rows.length > 0) {
          //hashing the password and saving it in the database
        bcrypt.hash(newPassword, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
            res.render("signin.ejs",{
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
                return res.render("change_pass.ejs", {
                  error: "Failed to send OTP. Please try again later."
                });
              } else {
                console.log(otp)
                console.log('OTP sent: ' + info.response);
                // Store the OTP in the session (or use any other temporary storage)
                emailMap.set(email,{
                  otp:otp,
                  password:hash,
                })
                console.log("Successfully entered into the hashmap");
                // Render the OTP input page
                return res.render("otp_changepass.ejs", {
                  message: "Please enter the OTP sent to your email",
                  email:email,
                });
              }
            });
        }
      });
      }else{
        return res.render("signup.ejs",{
          error:"Your Email is Not Registered"
        },)
      }
    } catch (err) {
      res.render("signin.ejs",{
        error:"Something is Wrong Please Try Again Later"
      });
      console.log(err);
    }
  }

});

app.post("/changepass-otp/:email", async (req, res) => {
  const email=req.params.email;
  let obj=emailMap.get(email);
  const enteredOtp = req.body.otp;
  let sended_otp;
  let user_pass;
  if(emailMap.has(email)){
    sended_otp=obj.otp;
    user_pass=obj.password;
  }else{
    res.render("change_pass.ejs",{
      error:"Something Is Wrong Try Again"
    })
  }

  // Check if OTP is valid
  if (enteredOtp == sended_otp) {
    // Save user to the database after OTP verification
    try {
      
      await db.query("UPDATE users SET password = $1 WHERE email = $2", [
        user_pass,email,
      ]);
      console.log("User registered successfully!");

      // Clear OTP from session after successful verification
      emailMap.delete(email);
      console.log("email deleted successfully")
      
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Or any email service
        secure: true,
        port:465,
        auth: {
          user: 'rishabhgarai7@gmail.com',
          pass: 'xgabndbrcfwliisj' // Use environment variables for production
        }
      });
      //current date and time
      const currentDate = new Date();
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      const formattedDate = currentDate.toLocaleString('en-US', options);
      //sending otp thrugh mail
      const mailOptions = {
        from: 'rishabhgarai7@gmail.com',
        to: email,
        subject: 'Your password has been changed',
        text: `Your Password is Successfully changed on ${formattedDate}`,
      };

      // Send the OTP email
      transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.log('Error sending OTP:', error);
          return res.render("signin.ejs", {
            error: "Try to Log in with New Password"
          });
        } else {
          // Render the OTP input page
          return res.render("signin.ejs", {
            error: "Your Password is Successfully Changed"
          });
        }
      });
    } catch (err) {
      console.error("Database error:", err);
      return res.render("signin.ejs", {
        error: "Something Went Wrong. Please Try Again Later"
      });
    }
  } else {
    console.log("Invalid OTP entered.");
    return res.render("otp_changepass.ejs", {
      error: " Wrong OTP",
      email:email
    });
  }
});


app.get("/signin", (req, res) => {
  res.render("signin.ejs");
});

app.post("/signin", (req, res, next) => {
  console.log(req.body.email);
  console.log(req.body.password);
  passport.authenticate("local", (err, user, info) => {
      if (err) {
          console.error("Error in authentication:", err);
          return res.render("signin.ejs",{
            error:"Something Went Wrong Try Agian Later"
          });
      }
      if (!user) {
          console.log("Authentication failed:", info);
          return res.render("signin.ejs",{
            error:"Your Email or Password Is Wrong"
          });
      }
      req.logIn(user, (err) => {
          if (err) {
              console.error("Error during login:", err);
              return res.render("signin.ejs",{
                error:"Something Went Wrong Try Again Later"
              });
          }
          console.log("User authenticated successfully:", user);
          const now = new Date();
          const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear().toString().slice(-2)}`;
          return res.redirect("/file_search");
      });
  })(req, res, next);
});


passport.use(
  new Strategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, cb) => {
      console.log("Authenticating user:", email);
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
          console.log("No user found for email:", email);
          return cb(null, false, { message: "User not found" });
        }
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        console.log("Stored hashed password:", storedHashedPassword);
        
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error during password comparison:", err);
            return cb(err);
          }
          if (valid) {
            console.log("Password matches for user:", user);
            return cb(null, user);
          } else {
            console.log("Invalid password for user:", email);
            return cb(null, false, { message: "Invalid password" });
          }
        });
      } catch (err) {
        console.error("Database error:", err);
        return cb(null, false, { message: "Database error" });
      }
    }
  )
);

app.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return render("file_search.ejs",{
        error:"Something Went Wrong Fail to Log out"
      })
    }
    // Redirect to the home page
    res.redirect('/');
  });
});


passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

//............................................LOG IN PART ||..........................

app.post("/search_file", async (req, res) => {
  const file_id=req.body.file_id;

  try {
    const result = await dbfile.query("SELECT dep_name, date FROM file_location  WHERE file_id =$1 ORDER BY number ", [
      file_id,
    ]);

    if (result.rows.length == 0) {
      console.log("Invalid file id");
      res.render("file_search.ejs",{
        error:" YOUR FILE HAS NOT BEEN SUBMITTED YET",
      });
    } else {
      console.log("file found");
      res.render("file_info.ejs",{
        file_id:file_id,
        files:result.rows,
      })
    }
  } catch (err) {
    console.log("data base error");
      res.render("file_search.ejs",{
        error:"SOMETINGS WENT WRONG TRY AGAIN",
      });
  }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:3000`);
  });