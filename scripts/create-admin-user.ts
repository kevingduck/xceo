import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// Load environment variables
config();

const scryptAsync = promisify(scrypt);

// Hash function from auth.ts
const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
};

async function createAdminUser() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in .env file");
  }

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists!");
      process.exit(0);
    }

    // Hash the password
    const hashedPassword = await hashPassword("admin123");

    // Create admin user
    const [newAdmin] = await db
      .insert(users)
      .values({
        username: "admin",
        password: hashedPassword,
        role: "admin",
      })
      .returning();

    console.log("Admin user created successfully!");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("Role: admin");
    console.log("User ID:", newAdmin.id);
    console.log("\nNote: Email field is not available in the current database schema.");

  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
createAdminUser();