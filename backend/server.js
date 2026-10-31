import "dotenv/config";
import app from "./src/app.js";
import connectToDB from "./src/config/db.js";

const startServer = async () => {
  await connectToDB();

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});