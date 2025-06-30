import express from "express";
const router = express.Router();

export default (db) => {

router.get("/files_info/:dept", async (req, res) => {
  const dept = req.params.dept;

  try {
    // ✅ Fetch files for the department
    const files = await db.query(
      "SELECT * FROM file_dept WHERE dept = $1 ORDER BY id ASC",
      [dept]
    );

    let name;

    if (dept === "Dean Office") {
      // ✅ Get name from deans
      const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
      name = deanResult.rows.length ? deanResult.rows[0].name : "";
    } else {
      // ✅ Get name from faculties where dept matches
      const facultyResult = await db.query(
        "SELECT name FROM faculties WHERE dept = $1 LIMIT 1",
        [dept]
      );
      name = facultyResult.rows.length ? facultyResult.rows[0].name : "";
    }

    // ✅ Render the filesHandler page
    return res.render("filesHandler.ejs", {
    
      name: name,
      dept: dept,
      files: files.rows,
    });
  } catch (err) {
    console.error("Error in GET /files_info/:dept:", err);

    // ⛔ Fallback in case of error
    const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
    const deanName = deanResult.rows.length ? deanResult.rows[0].name : "";

    const filesResult = await db.query(
      "SELECT * FROM file_collection WHERE tag = false AND file_topic = 'Others'"
    );

    return res.render("addFilesForDean", {
      name: deanName,
      files: filesResult.rows,
      dept: "Dean Office",
      error: err.message || "Something went wrong while processing the file.",
    });
  }
});

  router.post("/hold/:file_code/:dept/:name", async (req, res) => {
    const { file_code, dept, name } = req.params;
    const { reason } = req.body;

    try {
      const today = new Date().toISOString().split("T")[0];
      const statusMsg = `Your file has been put on hold on ${today}`;

      // ✅ Update status + optionally store reason (if column exists)
      await db.query(
        `UPDATE file_information 
         SET status = $1
         WHERE file_code = $2 AND dept_name = $3`,
        [statusMsg, file_code, dept]
      );

      // ✅ Fetch updated file list
      const files = await db.query(
        "SELECT * FROM file_dept WHERE dept = $1 ORDER BY id ASC",
        [dept]
      );

      return res.render("filesHandler", {
        successMessage: "Your file has been put on hold",
        files: files.rows,
        dept,
        name,
      });

    } catch (err) {
      console.error("❌ Error in /hold:", err.message);

      const files = await db.query(
        "SELECT * FROM file_dept WHERE dept = $1 ORDER BY id ASC",
        [dept]
      );

      return res.render("filesHandler", {
        error: "Database Error",
        files: files.rows,
        dept,
        name,
      });
    }
  });

  return router;
};
