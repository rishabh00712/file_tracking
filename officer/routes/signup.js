import express from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { emailMap } from "../memory/emailMap.js"; // ✅ shared memory map

const router = express.Router();
const saltRounds = 10;

export default (db) => {
  router.get("/signup", (req, res) => {
    res.render("signup.ejs");
  });

  router.post("/signup", async (req, res) => {
    const { name,dept, email, password } = req.body;

    try {
      // Check if user already exists
      const checkResult = await db.query("SELECT * FROM faculties WHERE email = $1 AND dept = $2", [email,dept]);
      if (checkResult.rows.length > 0) {
        return res.render("signin.ejs", { error: "Email already exists. Try logging in." });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
      console.log(`Generated OTP for ${email}: ${otp}`);

      // Send OTP email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 465,
        secure: true,
        auth: {
          user: "rishabhgarai7@gmail.com",
          pass: "pgaqlnlxbsqgynjm",
        },
      });

      const mailOptions = {
        from: "rishabhgarai7@gmail.com",
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is: ${otp}`,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending OTP:", error);
          return res.render("signup.ejs", {
            error: "Failed to send OTP. Please try again.",
          });
        }

        // Store user info in emailMap
        emailMap.set(email, {
          name,
          password: hashedPassword,
          department: dept,
          otp,
        });

        // Render OTP page with email param for form submission
        return res.render("otp_req.ejs", {
          successMessage: "Please enter the OTP sent to your email.",
          email,
        });
      });
    } catch (err) {
      console.error("Signup error:", err);
      return res.render("signup.ejs", {
        error: "Something went wrong. Please try again.",
      });
    }
  });

  return router;
};
