import mongoose from "mongoose";

const CuentaSchema = new mongoose.Schema({
	usuario_id: mongoose.Schema.Types.ObjectId,
	saldo: Number,
	card: String,
});

export const Cuenta = mongoose.model("Cuenta", CuentaSchema);