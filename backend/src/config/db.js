import mongoose from "mongoose";

const connectToDB = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error("Set MONGO_URI or MONGODB_URI to connect to MongoDB.");
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to database.");
};

export default connectToDB;