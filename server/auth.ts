import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, loginUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export function setupAuth(app: Express) {
  try {
    const MemoryStore = createMemoryStore(session);
    const sessionSettings: session.SessionOptions = {
      secret: process.env.REPL_ID || "ai-ceo-platform",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    };

    if (app.get("env") === "production") {
      app.set("trust proxy", 1);
      sessionSettings.cookie = {
        secure: true,
        maxAge: 24 * 60 * 60 * 1000
      };
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
      new LocalStrategy(async (username, password, done) => {
        try {
          console.log("Attempting login for user:", username);
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username))
            .limit(1);

          if (!user) {
            console.log("User not found:", username);
            return done(null, false, { message: "Invalid username or password" });
          }
          const isMatch = await crypto.compare(password, user.password);
          if (!isMatch) {
            console.log("Password mismatch for user:", username);
            return done(null, false, { message: "Invalid username or password" });
          }
          console.log("Login successful for user:", username);
          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      })
    );

    passport.serializeUser((user: Express.User, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        done(null, user);
      } catch (err) {
        done(err);
      }
    });

    // Register route
    app.post("/api/register", async (req, res, next) => {
      try {
        console.log("Registration attempt:", req.body);
        const result = insertUserSchema.safeParse(req.body);
        if (!result.success) {
          const errorMessage = result.error.issues.map(i => i.message).join(", ");
          console.error("Registration validation failed:", errorMessage);
          return res.status(400).json({ 
            ok: false,
            message: "Invalid input: " + errorMessage 
          });
        }

        const { username, password } = result.data;

        // Check if user already exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existingUser) {
          return res.status(400).json({ 
            ok: false,
            message: "Username already exists" 
          });
        }

        // Hash the password
        const hashedPassword = await crypto.hash(password);

        // Create the new user
        const [newUser] = await db
          .insert(users)
          .values({
            username,
            password: hashedPassword,
          })
          .returning();

        console.log("User registered successfully:", username);

        // Log the user in after registration
        req.login(newUser, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            ok: true,
            message: "Registration successful",
            user: { id: newUser.id, username: newUser.username },
          });
        });
      } catch (error) {
        console.error("Registration error:", error);
        next(error);
      }
    });

    // Login route
    app.post("/api/login", (req, res, next) => {
      console.log("Login attempt:", req.body);
      const result = loginUserSchema.safeParse(req.body);
      if (!result.success) {
        const errorMessage = result.error.issues.map(i => i.message).join(", ");
        console.error("Login validation failed:", errorMessage);
        return res.status(400).json({ 
          ok: false,
          message: "Invalid input: " + errorMessage 
        });
      }

      passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.status(400).json({ 
            ok: false,
            message: info.message ?? "Login failed" 
          });
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          return res.json({
            ok: true,
            message: "Login successful",
            user: { id: user.id, username: user.username },
          });
        });
      })(req, res, next);
    });

    // Logout route
    app.post("/api/logout", (req, res) => {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({
            ok: false,
            message: "Logout failed"
          });
        }
        res.json({ 
          ok: true,
          message: "Logout successful" 
        });
      });
    });

    // Get current user route
    app.get("/api/user", (req, res) => {
      if (req.isAuthenticated()) {
        return res.json(req.user);
      }
      res.status(401).json({ 
        ok: false,
        message: "Not logged in" 
      });
    });

  } catch (error) {
    console.error("Auth setup error:", error);
    throw error;
  }
}