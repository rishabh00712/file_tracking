import express from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { emailMap } from "../memory/emailMap.js"; // shared map

const router = express.Router();
const saltRounds = 10;

export default (db) => {
  router.get("/forgotPass", (req, res) => {
    res.render("passChange.ejs");
  });

  router.post("/passChange", async (req, res) => {
    const { email, dept, password, password_again } = req.body;
    console.log(email,dept);
    if (password !== password_again) {
      return res.render("change_pass.ejs", {
        error: "The passwords entered do not match",
      });
    }

    try {
      let result;
      if (dept === "Dean Office") {
        // Check in deans table
        result = await db.query(
          "SELECT * FROM deans WHERE email = $1",
          [email]
        );
        console.log(result)
      } else {
        // Check in faculties table
        result = await db.query(
          "SELECT * FROM faculties WHERE email = $1 AND dept = $2",
          [email, dept]
        );
      }

      if (result.rows.length === 0) {
        return res.render("signup.ejs", {
          error: "Your email is not registered",
        });
      }

      // Hash new password
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.render("signin.ejs", {
            error: "Something went wrong. Please try again later.",
          });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        console.log("Generated OTP:", otp);

        const transporter = nodemailer.createTransport({
          service: "gmail",
          port: 465,
          secure: true,
          auth: {
            user: "rishabhgarai7@gmail.com",
            pass: "xgabndbrcfwliisj", // for prod, use env var
          },
        });

        const mailOptions = {
          from: "rishabhgarai7@gmail.com",
          to: email,
          subject: "Your OTP Code for Password Change",
          text: `Your OTP code is: ${otp}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending OTP:", error);
            return res.render("change_pass.ejs", {
              error: "Failed to send OTP. Please try again later.",
            });
          }

          // Store new hashed password and OTP
          emailMap.set(email, {
            department: dept,
            otp,
            password: hash, // store hashed password
            updateTable: dept === "Dean Office" ? "deans" : "faculties", // track where to update
          });

          console.log("Stored new credentials in map for:", email);

          return res.render("otp_req.ejs", {
            message: "Please enter the OTP sent to your email",
            email,
          });
        });
      });
    } catch (err) {
      console.error("Error during change-pass:", err);
      return res.render("signin.ejs", {
        error: "Something went wrong. Please try again.",
      });
    }
  });

  return router;
};
