// passportConfig.js
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import db from "./db.js";

// Local strategy for email-password
passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
          return done(null, false, { message: "User not found" });
        }

        const user = result.rows[0];
        const storedHashedPassword = user.password;

        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) return done(err);
          if (valid) return done(null, user);
          else return done(null, false, { message: "Invalid password" });
        });
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
