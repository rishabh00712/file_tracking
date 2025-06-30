import express from "express";
import { getCurrentDateFormatted } from '../utils/dateFormatter.js';

const router = express.Router();
import { emailMap } from "../memory/emailMap.js";

export default (db) => {
  router.post("/verify-otp/:email", async (req, res) => {
    const user_email = req.params.email;
    console.log("The email is", user_email);

    const enteredOtp =
      (req.body.digit1 || "") +
      (req.body.digit2 || "") +
      (req.body.digit3 || "") +
      (req.body.digit4 || "") +
      (req.body.digit5 || "") +
      (req.body.digit6 || "");

    console.log(`Entered OTP: ${enteredOtp}`);

    const obj = emailMap.get(user_email);
    if (!obj) {
      return res.render("signup.ejs", {
        error: "Something Went Wrong. Please Try Again",
      });
    }

    const { otp: sended_otp, name: user_name, department: dept, password: user_pass } = obj;
    console.log("Expected OTP:", sended_otp);

    if (enteredOtp === sended_otp.toString()) {
      try {
        if (!user_name) {
          // Password reset scenario
          if (dept === "Dean Office") {
            // Update password in deans table
            await db.query(
              "UPDATE deans SET password = $1 WHERE email = $2",
              [user_pass, user_email]
            );
          } else {
            // Update password in faculties table
            await db.query(
              "UPDATE faculties SET password = $1 WHERE email = $2 AND dept = $3",
              [user_pass, user_email, dept]
            );
          }
          
          emailMap.delete(user_email);
          return res.redirect(
            `/signin?successMessage=${encodeURIComponent("Your password is changed. Please login with your new password.")}`
          );
        } else {
          // New registration
          const date = getCurrentDateFormatted();
          if (dept === "Dean Office") {
            // Register in deans table (if your workflow requires dean registration, else skip this block)
            await db.query(
              "INSERT INTO deans (name, email, password) VALUES ($1, $2, $3)",
              [user_name, user_email, user_pass]
            );
          } else {
            await db.query(
              "INSERT INTO faculty_request (name, email, dept, date, password) VALUES ($1, $2, $3, $4, $5)",
              [user_name, user_email, dept, date, user_pass]
            );
          }

          console.log("User registered successfully!");
          emailMap.delete(user_email);

          return res.render("signup.ejs", {
            successMessage: "User registration request submitted. Please wait for dean's response.",
          });
        }
      } catch (err) {
        console.error("Database error:", err);
        return res.render("signup.ejs", {
          error: "Something Went Wrong. Please Try Again Later.",
        });
      }
    } else {
      console.log("Invalid OTP entered.");
      return res.render("otp_req.ejs", {
        error: "Invalid OTP. Please try again.",
        email: user_email,
      });
    }
  });

  return router;
};
