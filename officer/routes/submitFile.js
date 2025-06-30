import express from "express";
const router = express.Router();

export default (db) => {
  router.get("/submitFile/:file_code/:dept/:name", async (req, res) => {
    const { file_code, dept, name } = req.params;

    try {
      // ✅ Step 1: Remove the row from file_dept
      await db.query(
        "DELETE FROM file_dept WHERE file_code = $1 AND dept = $2",
        [file_code, dept]
      );

      // ✅ Step 2: Get dept_array from dept_array table
      const deptArrResult = await db.query(
        "SELECT * FROM dept_array WHERE file_code = $1",
        [file_code]
      );

      if (deptArrResult.rows.length === 0) {
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

      const deptArrRow = deptArrResult.rows[0];
      let departments = deptArrRow.dept_array;
      const file_topic = deptArrRow.file_topic || "No Topic";
      const today = new Date().toISOString().split("T")[0];

      // ✅ Step 3: If array is empty → remove row from dept_array
      if (!departments || departments.length === 0) {
        await db.query(
          "DELETE FROM dept_array WHERE file_code = $1",
          [file_code]
        );

        await db.query(
          `UPDATE file_information 
           SET status = 'File Approved in this department', date = $1
           WHERE file_code = $2 AND dept_name = $3`,
          [today, file_code, dept]
        );

        const files = await db.query(
          "SELECT * FROM file_dept WHERE dept = $1 ORDER BY id ASC",
          [dept]
        );

        return res.render("filesHandler", {
          successMessage: "Your file is submitted",
          files: files.rows,
          dept,
          name,
        });
      }

      // ✅ Step 4: Get the next department
      const nextDept = departments.pop(); // last in queue

      // ✅ Step 5: Update the dept_array table
      await db.query(
        "UPDATE dept_array SET dept_array = $1 WHERE file_code = $2",
        [departments, file_code]
      );

      // ✅ Step 6: Insert into file_dept
      await db.query(
        "INSERT INTO file_dept (dept, file_code, file_topic, date) VALUES ($1, $2, $3, $4)",
        [nextDept, file_code, file_topic, today]
      );

      // ✅ Step 7: Update current dept status as approved
      await db.query(
        `UPDATE file_information 
         SET status = 'File Approved in this department', date = $1
         WHERE file_code = $2 AND dept_name = $3`,
        [today, file_code, dept]
      );

      // ✅ Step 8: Update next dept status as pending
      await db.query(
        `UPDATE file_information 
         SET status = 'This file is pending here', date = $1
         WHERE file_code = $2 AND dept_name = $3`,
        [today, file_code, nextDept]
      );

      // ✅ Step 9: Get updated file list
      const files = await db.query(
        "SELECT * FROM file_dept WHERE dept = $1 ORDER BY id ASC",
        [dept]
      );

      return res.render("filesHandler", {
        successMessage: "Your file is submitted",
        files: files.rows,
        dept,
        name,
      });

    } catch (err) {
      console.error("❌ Error in /submitFile:", err.message);

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
