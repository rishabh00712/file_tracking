import express from "express";
import bcrypt from "bcrypt";

const router = express.Router();

export default (db) => {
  router.get("/signin", (req, res) => {
    res.render("signin.ejs");
  });

  router.post("/signin", async (req, res) => {
    const { email, dept, password } = req.body;

    try {
      let result;
      if (dept === "Dean Office") {
        result = await db.query("SELECT * FROM deans WHERE email = $1", [email]);
      } else {
        result = await db.query("SELECT * FROM faculties WHERE email = $1 AND dept = $2", [email, dept]);
      }

      if (result.rows.length === 0) {
        return res.render("signup.ejs", { error: "Faculty not found, please sign up" });
      }

      const user = result.rows[0];

      bcrypt.compare(password, user.password, async (err, valid) => {
        if (err || !valid) {
          return res.render("signin.ejs", { error: "Wrong password, try again or reset your password" });
        }

        // On successful login:
        let files = { rows: [] };
        let name = { rows: [{ name: user.name }] };
        if (dept === "Dean Office") {
          // Get files handled by dean, or customize as needed
          files = await db.query("SELECT * FROM file_dept WHERE dept = $1 ORDER BY id ASC", [dept]);
          // name is already available as user.name
        } else {
          files = await db.query("SELECT * FROM file_dept WHERE dept = $1 ORDER BY id ASC", [dept]);
          name = await db.query("SELECT name FROM faculties WHERE email = $1 AND dept = $2", [email, dept]);
        }

        return res.render("filesHandler.ejs", {
          successMessage: "Successfully signed in",
          name: name.rows[0].name,
          dept: dept,
          files: files.rows
        });
      });
    } catch (err) {
      return res.render("signin.ejs", { error: "Database error, try again later" });
    }
  });

  return router;
};
