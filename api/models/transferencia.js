import mongoose from "mongoose";

const TransferenciaSchema = new mongoose.Schema({
	emisor_id: mongoose.Schema.Types.ObjectId,
	receptor_id: mongoose.Schema.Types.ObjectId,
	monto: Number,
	descripcion: String,
});

export const Transferencia = mongoose.model("Transferencia",TransferenciaSchema);