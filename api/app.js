import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import Usuario from "./models/usuario.js";
import { Cuenta } from "./models/cuenta.js";
import { Transferencia } from "./models/transferencia.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
/*
mongoose.connect(process.env.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});
*/
mongoose
  .connect(
	"mongodb+srv://mongo:pass1@memo9ty.mbcr4vr.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("Connected to Mongo Database");
  })
  .catch((error) => {
    console.error(`Connection refuse: ${error}`);
  });

var db =[];
app.get("API/hola", (req, res) => {
	res.json({ message: "Bienvenido " });
});

function verifyToken(req, res, next) {
	const token = req.cookies.token;

	if (!token) return res.status(401).json({ error: "Access Denied" });

	jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
		if (err)
			return res.status(400).json({ error: "Invalid Token" });

		req.userId = decoded.id;
		next();
	});
}

app.get("/API/authenticated", (req, res) => {
	console.log("req.cookies: ", req.cookies);
	const token = req.cookies.token;
	if (token) {
		jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
			if (err) {
				res.json({ authenticated: false });
			} else {
				res.json({ authenticated: true });
			}
		});
	} else {
		res.json({ authenticated: false });
	}
});

app.post("/ingresar", async (req, res) => {
	let email = req.body.user;
	let pass = req.body.pass;

	if (email && pass) {
		const usuario = await Usuario.findOne({
			usuario: email,
			contrasena: pass,
		});

		if (usuario) {
			const token = jwt.sign(
				{ id: usuario._id },
				process.env.JWT_SECRET,
				{
					expiresIn: 3600, 
				}
			);

			res.cookie("token", token, { httpOnly: true });

			res.status(200).json({ usuario: usuario.usuario });
		} else {
			res.status(400).json({error: "Usuario o contraseña incorrectos.",});
		}
	} else {
		res.status(400).json({error: "Por favor, proporciona un nombre de usuario y una contraseña.",});
	}
});

app.get("/salir", (req, res) => {
	res.clearCookie("token");
	res.json(true);
});

app.post("/usuario", async (req, res) =>{
	const { usuario, email, password } = req.body;

	try {
		if (!usuario || !password || !email ) {return res.status(400).json({error: "Por favor, completa todos los campos.",});}
		const Exisuser = await Usuario.findOne(email);
		if(Exisuser){
			return res.status(400).json(false);
		};
		const nuevoUsuario = new Usuario({
			usuario,
			email,
			password,
		});

		await nuevoUsuario.save();
		const token = jwt.sign(
			{ id: nuevoUsuario._id },
			process.env.JWT_SECRET,
			{
				expiresIn: 3600,
			}
		);

		res.cookie("token", token, { httpOnly: true });

		res.status(200).json(true);
	} catch (err) {
		console.error("Hubo un problema al registrar el usuario.", error);
		res.status(400).json(false);
	}
});

app.post("/transferir",async (req,res)=>{
	const { emisor_id, receptor_id, monto, descripcion } = req.body; 
	try{
	const cuentaEmisor = await Cuenta.findOne({ usuario_id: emisor_id });
	const cuentaReceptor = await Cuenta.findOne({ usuario_id: receptor_id });

	if (!cuentaEmisor) {
		return res.json(false);
	}
	if (!cuentaReceptor) {
		return res.json(false);
	}
	if (cuentaEmisor.saldo < monto) {
		return res.json(false);
	}

	cuentaEmisor.saldo -= monto;
	cuentaReceptor.saldo += monto;
	await cuentaEmisor.save();
	await cuentaReceptor.save();

	const transferencia = new Transferencia({
		emisor_id,
		receptor_id,
		monto,
		descripcion, 
	});
	await transferencia.save();
	res.json(true);
	}catch (error) {
		console.error('error al transferiri :', error);
		res.json(false);
	}
	res.sendFile(path.join(__dirname,"public/html/estado.html", {
		message: "Transferencia realizada con éxito",
	}));
});

app.post("/recargar",async (req,res)=>{
	const { monto, tarjeta } = req.body;
  	if (!monto || !tarjeta) {return res.status(400).json({error: "Faltan datos.",}) }

	try{
	const userExis = await Cuenta.findOne({card: targeta});
	if(!userExis){
		return res.json(false);
	}
	if (monto === 0) {
		return res.json(false);
	  }
	userExis.monto += monto;
	await userExis.save();
	const transferencia = new Transferencia({
		monto: monto, 
	});
	await transferencia.save();
	res.json(true);
	}catch (error) {
		console.error('Error al cargar el amount:', error);
		res.json(false);
	}
	res.sendFile(path.join(__dirname,"public/html/estado.html", {
		message: "Recarga realizada con éxito",
	}));

  
});

app.post("/retirar",async (req,res)=>{
	const { emisor_id, monto, creditcard } = req.body;
	try{
	const cuentaEmisor = await Cuenta.findOne({ usuario_id: emisor_id });
	if (!cuentaEmisor) {
		return res.json(false);
	}
	if (cuentaEmisor.saldo < monto) {
		return res.json(false);
	}
	cuentaEmisor.saldo -= monto;
	await cuentaEmisor.save();
	
	const transferencia = new Transferencia({
		emisor_id,
		receptor_id,
		monto,
		descripcion, 
	});
	await transferencia.save();
	res.json(true);
	}catch (error) {
		console.error('error al retirar dinero xd:', error);
		res.json(false);
	}
	res.status(200).render("estado", {
		message: "Transferencia realizada con éxito",
	});

});

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public/html/index.html"));
});

app.get("/usuario", async(req, res) => {
	const user = await Usuario.find();
	if(!user){return res.json(false);}
	res.json({
		name: user.nombre,
		email: user.email,
	});
});
app.get("/user/:email",async (req, res) => {
	const Exisemail = await Usuario.findOne(Exisemail= req.params.email);
	if(!Exisemail){
		res.status(404).json({
			message: 'email no existe'
		});
	}
	res.json({
		name : Exisemail.nombre ,
		email: Exisemail.email,
	});

});
app.get("/login",(req,res)=>{
	res.sendFile(path.join(__dirname, "public/html/login.html"));
});
app.get("/transferencia",verifyToken,(req,res)=>{
	res.sendFile(path.join(__dirname, "public/html/transferir.html"));
});
app.get("/list_all",async(req,res)=>{
	const user = await Usuario.find({});
	res.json({user});
})
app.get("/movimientos",verifyToken,async(req,res)=>{
	res.json(db);
	if (!req.user) {
		return res.json(false);
	  }
	
	  try {
		const movimientos = await Transferencia.find({ email: req.user.email });
	
		if (movimientos.length === 0) {return res.json(false);}
	
		const mov = {
		  movements: movimientos.map((movimiento) => ({
			emisor_id: movimiento.emisor_id,
			monto: movimiento.monto,
			receptor_id: movimiento.receptor_id,
			descripcion: movimiento.descripcion
		  }))
		};
	
		res.json(mov);
	  } catch (error) {
		console.error('error al ver los movimientos:', error);
		res.json(false);
	  }
	/*res.sendFile(path.join(__dirname,"public/html/estado.html"));*/
})

app.listen(PORT, () => {
	console.log(`Servidor Express en ejecución en el puerto ${PORT}`);
});