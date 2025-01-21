const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(express.json());
app.use(cors());

const port = 3000;
let utilisateurs = [];

app.post("/Utilisateur", async (req, res) => {
  const { prenom, nom, email, niveau, questions } = req.body;

  
  if (!prenom || !nom || !email || !niveau || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Données invalides. Tous les champs sont requis." });
  }

  try {
   
    console.log("Insertion de l'utilisateur avec les données :", { prenom, nom, email, niveau });
    const utilisateurResult = await pool.query(
      "INSERT INTO utilisateurs (prenom, nom, email, niveau) VALUES ($1, $2, $3, $4) RETURNING id",
      [prenom, nom, email, niveau]
    );

    const utilisateurId = utilisateurResult.rows[0].id;

   
    const insertPromises = questions.map((response, index) => {
      console.log(
        `Insertion dans reponses : utilisateur_id=${utilisateurId}, question_id=${index + 1}, reponse=${response}`
      );
      return pool.query(
        "INSERT INTO reponses (utilisateur_id, question_id, reponse) VALUES ($1, $2, $3)",
        [utilisateurId, index + 1, response]
      );
    });

    await Promise.all(insertPromises);

    res.status(200).json({ message: "Utilisateur et réponses enregistrés avec succès." });
  } catch (err) {
    console.error("Erreur lors de l'insertion dans la base de données :", err.message);

    if (err.code === "23505") { 
      res.status(400).json({ error: "Un utilisateur avec cet email existe déjà." });
    } else {
      res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement des données." });
    }
  }
});








app.get("/Utilisateur", async (req, res) => {
  try {
    
    
    const result = await pool.query(`
      SELECT u.id, u.prenom, u.nom, u.email, u.niveau, r.reponse
      FROM utilisateurs u
      LEFT JOIN reponses r ON u.id = r.utilisateur_id
    `);

   
    const utilisateurs = {}; 

    for (let i = 0; i < result.rows.length; i++) {
      const ref = result.rows[i]; 
    
      if (!utilisateurs[ref.id]) {
        utilisateurs[ref.id] = {
          id: ref.id,
          prenom: ref.prenom,
          nom: ref.nom,
          email: ref.email,
          niveau: ref.niveau,
          questions: [], 
        };
      }
    
      if (ref.reponse) {
        utilisateurs[ref.id].questions.push(ref.reponse);
      }
    }
    res.status(200).json(Object.values(utilisateurs));
  } catch (err) {
    console.error("Erreur lors de la récupération des utilisateurs :", err);
    res.status(500).json({ error: "Une erreur est survenue lors de la récupération des utilisateurs." });
  }
});

app.get("/login", async (req, res) => {
  const  email= req.query.email
   const  pwd  = req.query.pwd;

  if (!email || !pwd) {
    console.log("Invalid input");
    return res.status(400).send("Email and password are required.");
  }

  try {
    const sql = `select email, pwd from utilisateur where email='${email}' and pwd='${pwd}'`;
    const result= await pool.query(sql);
    if (result.rowCount > 0) {
      
      res.status(200).send({ error: false, data: "Connexion réussie !" });
    } else {
     
      res.status(401).send({ error: true, message: "Identifiants incorrects." });
    }
   
  } catch (error) {
    console.error("Error saving data:", error);
    res.status(500).send({error:true, message: "error"});
  }
});

app.post("/Enregistre", async (req, res) => {
  const { email, pwd, nom, prenom, genre } = req.body;

  if (!email || !pwd || !nom || !prenom || !genre) {
    return res.status(400).send("Tous les champs sont requis.");
  }

  try {
    const sql =
      "INSERT INTO utilisateur (email, pwd, nom, prenom, genre) VALUES ($1, $2, $3, $4, $5)";
    await pool.query(sql, [email, pwd, nom, prenom, genre]);
    res.status(201).send("Utilisateur enregistré avec succès !");
  
  } catch (error) {
    console.error("Erreur lors de l'enregistrement :", error.message);
    res.status(500).send("Une erreur est survenue.");
  }
});

app.post("/pfe", async (req, res) => {
  const { comptence } = req.body;

  if (!comptence) {
    return res.status(400).json("Tous les champs sont requis.");
  }
  ///test

  try {
    const sql =
      "INSERT INTO pfe (comptence ) VALUES ($1)";
    await pool.query(sql, [comptence ]);
    res.status(201).json("Utilisateur enregistré avec succès !");
  
  } catch (error) {
    console.error("Erreur lors de l'enregistrement :", error.message);
    res.status(500).json("Une erreur est survenue.");
  }
});




// Lancer le serveur
app.listen(port, () => console.log(`App listening on port ${port}`));
