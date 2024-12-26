import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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
          try{ await db.query(
              "INSERT INTO users ( name,email, password) VALUES ($1, $2,$3)",
              [name,email,hash]
            );
            res.render("file_info.ejs");
          }catch(err){
              console.log("Database error", err);
              res.render("signup.ejs",{
              error:"Something is Wrong Please Try Again Later"
            });
          }
        }
      });
    }
  } catch (err) {
    res.render("signin.ejs",{
      error:"Something is Wrong Please Try Again Later"
    });
    console.log(err);
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