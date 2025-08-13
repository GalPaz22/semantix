// lib/mongodb.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();


const uri =  process.env.MONGODB_URI 
if (!uri) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, connectTimeoutMS: 30000, serverSelectionTimeoutMS: 30000 });
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;
