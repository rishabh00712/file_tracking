import express from "express";
const router = express.Router();

export default (db) => {
  router.get("/views-files/dean", async (req, res) => {
    try {
      // Fetch all files
      const result = await db.query("SELECT * FROM file_dept ORDER BY dept, date DESC");
      const files = result.rows;  // This is already a flat array!

      // Get dean name as string
      const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
      const deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";

      // Render EJS view with files array
      return res.render("viewFiles.ejs", {
        file_depts: files,      // <-- files is an array!
        dept: "Dean Office",
        name: deanName
      });
    } catch (err) {
      console.error("Error fetching files:", err.message);
      // Get dean name as string for error view as well
      let deanName = "Dean";
      try {
        const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
        deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";
      } catch {}
      return res.render("viewFiles.ejs", {
        file_depts: [],
        dept: "Dean Office",
        name: deanName,
        error: err.message || "Unable to fetch files."
      });
    }
  });

  return router;
};
