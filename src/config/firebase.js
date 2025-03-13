import admin from "firebase-admin"
import dotenv from "dotenv";

dotenv.config();

if (!process.env.FIREBASE) {
  console.error("FIREBASE environment variable is missing!");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE, "base64").toString("utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase Admin Initialized!");

export default admin;