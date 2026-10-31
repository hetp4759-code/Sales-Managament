import "dotenv/config";
import mongoose from "mongoose";
import Admin from "../src/model/admin.model.js";

const seedAdmin = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL;
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!mongoUri || !name || !email || !password) {
    throw new Error(
      "Set MONGO_URI (or MONGODB_URI), ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD before seeding."
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  await mongoose.connect(mongoUri);

  const existingAdmin = await Admin.findOne({ role: "admin" }).select("_id");

  if (existingAdmin) {
    throw new Error("An admin account already exists; refusing to create another.");
  }

  await Admin.create({ name, email, password, role: "admin" });
  console.log(`Admin account created for ${email}.`);
};

try {
  await seedAdmin();
} catch (error) {
  console.error("Admin seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
