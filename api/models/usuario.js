import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    password: String,
    card: String,
})

export default mongoose.model("Usuario", userSchema);