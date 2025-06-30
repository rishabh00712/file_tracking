import pkg from 'pg';
// Import dotenv and call config() method
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;

// Your NeonDB Connection String
const connectionString =process.env.DB_URL;
// Initialize PostgreSQL Client
const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for NeonDB
});

const createUsersTable = async () => {
    try {
        await client.connect(); // Connect to the database
        console.log("Connected to NeonDB ✅");
        
         await client.query(
          `

          INSERT INTO file_collection (file_code, file_topic, user_name, user_email)
VALUES ('F1001', 'Some Topic', 'Rishabh', 'rishabhgarai33@gmail.com');

INSERT INTO file_information (file_code, dept_name, status, date) VALUES
('F1001', 'Finance Section', 'File completed in department', '29/12/24'),
('F1001', 'Internal Audit', 'Pending in this department', NULL),
('F1001', 'Director Office', 'Pending in this department', NULL),
('F1001', 'Dean Office', 'Pending in this department', NULL),
('F1001', 'E-Procurement', 'Pending in this department', NULL);





          `  // Correctly pass the values as an array
        );
        
        console.log("Table 'users' created successfully ✅");

    } catch (err) {
        console.error("Error creating table ❌", err);
    } finally {
        await client.end(); // Close the connection
    }
};

// Run the function
createUsersTable();
