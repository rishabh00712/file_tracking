import express from "express";
import nodemailer from "nodemailer";
const router = express.Router();

export default (db) => {
  // GET: Faculty request list
  router.get("/faculties/request-list", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM faculty_request ORDER BY id DESC");
      const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
      const deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";

      return res.render("addFaculty.ejs", {
        requests: result.rows,
        name: deanName,
        dept: "Dean Office",
      });
    } catch (err) {
      console.error("Error fetching faculty requests:", err.message);
      const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
      const deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";

      return res.render("addFaculty.ejs", {
        requests: [],
        name: deanName,
        dept: "Dean Office",
        error: err.message || "Unable to fetch faculty requests.",
      });
    }
  });

  // GET: Reject faculty request
  router.get("/rejectFaculty/:email/:dept", async (req, res) => {
    const { email, dept } = req.params;
    try {
      await db.query("DELETE FROM faculty_request WHERE email = $1 AND dept = $2", [email, dept]);
      res.redirect("/faculties/request-list");
    } catch (err) {
      console.error("Error rejecting faculty request:", err.message);
      res.redirect("/faculties/request-list");
    }
  });

  // GET: Accept faculty request
  router.get("/acpetFaculty/:email/:dept", async (req, res) => {
    const { email } = req.params;
    try {
      // Get faculty details
      const result = await db.query("SELECT * FROM faculty_request WHERE email = $1", [email]);
      if (result.rows.length === 0) throw new Error("Faculty not found");

      const faculty = result.rows[0];
      const { name, dept, password } = faculty;

      // Insert into faculties
      await db.query(
        "INSERT INTO faculties (name, dept, email, password) VALUES ($1, $2, $3, $4)",
        [name, dept, email, password]
      );

      // Delete from request table
      await db.query("DELETE FROM faculty_request WHERE email = $1", [email]);

      // Send approval mail
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
        subject: "Faculty Registration Approved",
        text: `${name}, your request has been accepted by the Dean.`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("❌ Error sending email:", error.message);
        } else {
          console.log("✅ Email sent:", info.response);
        }
      });

      res.redirect("/faculties/request-list");

    } catch (err) {
      console.error("Error accepting faculty request:", err.message);
      res.redirect("/faculties/request-list");
    }
  });

  return router;
};
