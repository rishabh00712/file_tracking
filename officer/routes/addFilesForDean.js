import express from "express";
const router = express.Router();

function getTodayDateString() {
  const today = new Date();
  return today.toLocaleDateString("en-GB"); // dd/mm/yyyy
}

export default (db) => {
  router.get("/fileadd/:dept", async (req, res) => {
    const { dept } = req.params;
    try {
      if (dept === "Dean Office") {
        const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
        if (deanResult.rows.length === 0) {
          return res.render("addFilesForDean", {
            error: "Dean not found",
            name: "",
            dept,
            files: [],
          });
        }

        const deanName = deanResult.rows[0].name;
        const filesResult = await db.query(
          "SELECT * FROM file_collection WHERE tag = false AND file_topic = 'Others'"
        );

        return res.render("addFilesForDean", {
          name: deanName,
          files: filesResult.rows,
          dept,
        });
      }

      else if (dept === "Store & Purchase Section") {
        const facultyResult = await db.query(
          "SELECT name FROM faculties WHERE dept = $1 LIMIT 1",
          [dept]
        );

        if (facultyResult.rows.length === 0) {
          return res.render("addFilesForFaculty", {
            error: "Faculty not found",
            name: "",
            dept,
            files: [],
          });
        }

        const facultyName = facultyResult.rows[0].name;

        return res.render("addFilesForFaculty", {
          name: facultyName,
          dept,
          files: [],
        });
      }

      return res.status(400).send("Unsupported department");
    } catch (err) {
      console.error("Error in GET /fileadd/:dept:", err);
      return res.render("addFilesForDean", {
        error: "Internal server error",
        name: "",
        dept,
        files: [],
      });
    }
  });
 router.post("/addFilesForFaculty", async (req, res) => {
  try {
    const { file_code, topic, name } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Find Store & Purchase Section faculty name
    const storeResult = await db.query(
      "SELECT name FROM faculties WHERE dept = $1 LIMIT 1",
      ["Store & Purchase Section"]
    );
    const storeName = storeResult.rows.length > 0 ? storeResult.rows[0].name : null;

    // 2. Check for duplicate file_code
    const existing = await db.query(
      "SELECT id FROM file_collection WHERE file_code = $1",
      [file_code]
    );
    if (existing.rows.length > 0) {
      return res.render("addFilesForFaculty.ejs", {
        error: "File code already exists. Please use a unique file code.",
        dept: "Store & Purchase Section",
        name: storeName
      });
    }

    if (!storeName) {
      return res.render("addFilesForFaculty.ejs", {
        error: "No Store & Purchase Section faculty found.",
        dept: "Store & Purchase Section",
        name: ""
      });
    }

    // Department arrays for each topic
    const PAYMENT_DEPTS = ["Director Office", "E-Procurement", "Internal Audit"];
    const APPROVAL_DEPTS = ["Director Office", "Accounts", "Finance"];
    // Expand APPROVAL_DEPTS as per your actual departments

    // ========== PAYMENT ==========
    if (topic === "Payment") {
      await db.query(
        `INSERT INTO file_collection (file_code, file_topic, user_name, tag) VALUES ($1, $2, $3, $4)`,
        [file_code, topic, name, true]
      );

      const depts = [...PAYMENT_DEPTS];
      depts.shift(); // Remove first dept for dept_array (used below)

      await db.query(
        `INSERT INTO dept_array (file_code, file_topic, dept_array) VALUES ($1, $2, $3)`,
        [file_code, topic, depts]
      );

      for (let i = 0; i < PAYMENT_DEPTS.length; i++) {
        const dept = PAYMENT_DEPTS[i];
        if (i === 0) {
          await db.query(
            `INSERT INTO file_information (file_code, dept_name, status, date) VALUES ($1, $2, $3, $4)`,
            [file_code, dept, `The file is in ${dept}`, today]
          );
        } else {
          await db.query(
            `INSERT INTO file_information (file_code, dept_name, status, date) VALUES ($1, $2, $3, $4)`,
            [file_code, dept, "Till now no pending", null]
          );
        }
      }

      return res.render("addFilesForFaculty.ejs", {
        successMessage: "File added for Payment process.",
        dept: "Store & Purchase Section",
        name: storeName
      });
    }

    // ========== APPROVAL ==========
    if (topic === "Approval") {
      await db.query(
        `INSERT INTO file_collection (file_code, file_topic, user_name, tag) VALUES ($1, $2, $3, $4)`,
        [file_code, topic, name, true]
      );

      const depts = [...APPROVAL_DEPTS];
      depts.shift();

      await db.query(
        `INSERT INTO dept_array (file_code, file_topic, dept_array) VALUES ($1, $2, $3)`,
        [file_code, topic, depts]
      );

      for (let i = 0; i < APPROVAL_DEPTS.length; i++) {
        const dept = APPROVAL_DEPTS[i];
        if (i === 0) {
          await db.query(
            `INSERT INTO file_information (file_code, dept_name, status, date) VALUES ($1, $2, $3, $4)`,
            [file_code, dept, `The file is in ${dept}`, today]
          );
        } else {
          await db.query(
            `INSERT INTO file_information (file_code, dept_name, status, date) VALUES ($1, $2, $3, $4)`,
            [file_code, dept, "Till now no pending", null]
          );
        }
      }

      return res.render("addFilesForFaculty.ejs", {
        successMessage: "File added for Approval process.",
        dept: "Store & Purchase Section",
        name: storeName
      });
    }

    // ========== OTHERS ==========
    if (topic === "Others") {
      await db.query(
        `INSERT INTO file_collection (file_code, file_topic, user_name, tag) VALUES ($1, $2, $3, $4)`,
        [file_code, topic, name, false]
      );
      return res.render("addFilesForFaculty.ejs", {
        successMessage: "File added to Others.",
        dept: "Store & Purchase Section",
        name: storeName
      });
    }

    // Invalid topic fallback
    return res.render("addFilesForFaculty.ejs", {
      error: "Invalid topic selected.",
      dept: "Store & Purchase Section",
      name: storeName
    });

  } catch (err) {
    console.error("Error in addFilesForFaculty:", err.message);
    return res.render("addFilesForFaculty.ejs", {
      error: err.message || "Something went wrong.",
      dept: "Store & Purchase Section",
      name: "" // or storeName if you want
    });
  }
});


  // ✅ POST /addfile/:fileCode
  router.post("/addfile/:fileCode", async (req, res) => {
    const { fileCode } = req.params;
    const { departments } = req.body;
    const deptArray = JSON.parse(departments || "[]");

    try {
      if (!Array.isArray(deptArray) || deptArray.length === 0) {
        throw new Error("No departments selected");
      }

      const reversed = [...deptArray].reverse();
      const currentDept = reversed.pop(); // most recent (first added)
      const today = getTodayDateString();
      const topic = "Others";

      // ✅ Insert into file_dept
      await db.query(
        `INSERT INTO file_dept (dept, file_code, file_topic, date) VALUES ($1, $2, $3, $4)`,
        [currentDept, fileCode, topic, today]
      );

      // ✅ Insert into file_information
      for (let i = 0; i < deptArray.length; i++) {
        const dept = deptArray[i];
        const isCurrent = dept === currentDept;
        const status = isCurrent ? `The file is in ${dept}` : "Pending";
        const date = isCurrent ? today : null;

        await db.query(
          `INSERT INTO file_information (file_code, dept_name, status, date) VALUES ($1, $2, $3, $4)`,
          [fileCode, dept, status, date]
        );
      }

      // ✅ Insert into dept_array
      await db.query(
        `INSERT INTO dept_array (file_code, file_topic, dept_array) VALUES ($1, $2, $3)`,
        [fileCode, topic, deptArray]
      );

      // ✅ Update tag in file_collection
      await db.query(`UPDATE file_collection SET tag = true WHERE file_code = $1`, [fileCode]);

      // ✅ Refetch updated data
      const deanResult = await db.query("SELECT name FROM deans LIMIT 1");
      const deanName = deanResult.rows.length ? deanResult.rows[0].name : "";

      const filesResult = await db.query(
        "SELECT * FROM file_collection WHERE tag = false AND file_topic = 'Others'"
      );

      return res.render("addFilesForDean", {
        name: deanName,
        files: filesResult.rows,
        dept: "Dean Office",
        successMessage: "File successfully routed to departments",
      });

    } catch (err) {
      console.error("Error in POST /addfile:", err);

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

  return router;
};
