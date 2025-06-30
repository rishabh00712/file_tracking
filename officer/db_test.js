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



const result = await client.query(
  `

-- Now insert the Dean record
INSERT INTO deans (name, email, password)
VALUES ('Rishabh Garai', 'rishabhgarai33@gmail.com', 'rishabh123');





  `
);




    

  } catch (err) {
    console.error("Error checking column ❌", err);
  } finally {
    await client.end(); // Close the connection
  }
};


// Run the function
createUsersTable();
