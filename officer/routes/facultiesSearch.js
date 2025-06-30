import express from "express";
const router = express.Router();

export default (db) => {
  // GET: Search faculties
  router.get("/search/faculties", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM faculties ORDER BY dept, name ASC");
      const faculties = result.rows;
      const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
      const deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";
      return res.render("facultiesSearch.ejs", {
        faculties: faculties,
        dept: "Dean Office",
        name: deanName,
        
       
      });
    } catch (err) {
      console.error("Error fetching faculties:", err.message);
      let deanName = "Dean";
      try {
        const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
        deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";
      } catch {}
      return res.render("facultiesSearch.ejs", {
        faculties: [],
        dept: "Dean Office",
        name: deanName,
        error: err.message || "Unable to fetch faculties.",
        
      });
    }
  });

  // GET: Delete a faculty
  router.get("/deleteFaculty/:email/:dept", async (req, res) => {
    const { email, dept } = req.params;
    let deanName = "Dean";
    try {
      // Delete faculty by email and dept
      await db.query("DELETE FROM faculties WHERE email = $1 AND dept = $2", [email, dept]);

      // Get updated faculty list
      const result = await db.query("SELECT * FROM faculties ORDER BY dept, name ASC");
      const faculties = result.rows;

      // Get dean name
      const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
      deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";

      // Render with success message
      return res.render("facultiesSearch.ejs", {
        faculties: faculties,
        dept: "Dean Office",
        name: deanName,
        
        successMessage: "Faculty deleted successfully.",
      });
    } catch (err) {
      console.error("Error deleting faculty:", err.message);

      // Try to get updated faculties list and dean name
      let faculties = [];
      try {
        const result = await db.query("SELECT * FROM faculties ORDER BY dept, name ASC");
        faculties = result.rows;
        const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
        deanName = deanResult.rows.length > 0 ? deanResult.rows[0].name : "Dean";
      } catch {}

      // Render with error message
      return res.render("facultiesSearch.ejs", {
        faculties: faculties,
        dept: "Dean Office",
        name: deanName,
        error: err.message || "Unable to delete faculty.",
        
      });
    }
  });

  return router;
};
