import mongoose, { Mongoose } from 'mongoose';


const MONGODB_URL = process.env.MONGODB_URL;    // URL for MongoDB connection, fetched from environment variables


interface MongooseConnection {                  // Interface for MongooseConnection object
  conn: Mongoose | null;                        // Mongoose connection object
  promise: Promise<Mongoose> | null;            // Promise that resolves to a Mongoose connection object
}

// Fetch the cached MongooseConnection object from the global scope
// If it doesn't exist, create a new one and assign it to the global scope
let cached: MongooseConnection = (global as any).mongoose
if (!cached) {
  cached = (global as any).mongoose = {
    conn: null, 
    promise: null
  }
}

export const connectToDatabase = async () => {                 // Function to establish a connection to the MongoDB database
 
  if (cached.conn) return cached.conn;                         // If a connection already exists, return it
  if (!MONGODB_URL) throw new Error('Missing MONGODB_URL');    // If the MongoDB URL is not provided, throw an error

  // If a connection promise doesn't exist, create a new one
  // The promise will resolve to a Mongoose connection object
  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: 'imaginify',  // specify the database name
      bufferCommands: false // disable Mongoose's buffering of commands
    })

  cached.conn = await cached.promise;                           // Await the connection promise and assign the resolved value to the 'conn' property

  
  return cached.conn;
}