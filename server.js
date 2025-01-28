const express = require("express");
const cors = require("cors");
const pool = require("./db");
const emailjs = require("emailjs-com");
const app = express();
app.use(express.json());
app.use(cors());

const port = 3000;
let utilisateurs = [];
app.post("/send-email", async (req, res) => { 
  const { toEmail, subject, message } = req.body; 

  try {
    const result = await emailjs.send(
      "service_eny414c",  // Votre Service ID
      "template_vcx0irc", // Votre Template ID
      {
        to_email: toEmail,  // email dynamique venant du frontend
        subject: subject,
        message: message,
      },
      "b73XoMyplII3wHvpp" // Votre User ID EmailJS
    );
    console.log("Email envoyé avec succès :", result);
    res.status(200).json({ message: "Email envoyé avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email :", error);
    res.status(500).json({ error: "Échec de l'envoi de l'email" });
  }
});






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




app.get('/Utilisateur', async (req, res) => {
  const email = req.query.email; // Récupérer l'email de la query string

  try {
    // Récupérer le nom et prénom à partir de la base de données
    const result = await pool.query('SELECT prenom, nom FROM utilisateur WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Retourner les informations de l'utilisateur
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de serveur' });
  }
});





app.get("/Admin", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.prenom, s.nom, s.email, s.niveau, r.reponse
      FROM utilisateurs s
      LEFT JOIN reponses r ON s.id = r.utilisateur_id
    `);

    // Regrouper les réponses par utilisateur
    const utilisateursMap = new Map();

    result.rows.forEach(row => {
      if (!utilisateursMap.has(row.id)) {
        utilisateursMap.set(row.id, {
          id: row.id,
          prenom: row.prenom,
          nom: row.nom,
          email: row.email,
          niveau: row.niveau,
          reponses: []
        });
      }
      if (row.reponse) {
        utilisateursMap.get(row.id).reponses.push(row.reponse);
      }
    });

    const utilisateursArray = Array.from(utilisateursMap.values());
    console.log("Résultats de la requête :", utilisateursArray);

    res.json(utilisateursArray);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
  }
});


app.delete("/Admin/:email", async (req, res) => {
  const { email } = req.params;

  try {
    // Requête SQL pour supprimer l'utilisateur par email
    const result = await pool.query(
      "DELETE FROM utilisateurs WHERE email = $1 RETURNING *",
      [email]
    );

    if (result.rowCount > 0) {
      res.status(200).json({
        message: "Utilisateur supprimé avec succès",
        utilisateur: result.rows[0],
      });
    } else {
      res.status(404).json({ message: "Utilisateur non trouvé" });
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.get("/login", async (req, res) => {
  const { email, pwd } = req.query;

  // Vérifiez si les champs sont renseignés
  if (!email || !pwd) {
    console.log("Invalid input");
    return res.status(400).json({ error: true, message: "Email et mot de passe requis." });
  }

  try {
    // Utilisation de requêtes paramétrées pour éviter les injections SQL
    const sql = `SELECT email, pwd, typeUser FROM utilisateur WHERE email = $1 AND pwd = $2`;
    const result = await pool.query(sql, [email, pwd]);

    if (result.rowCount === 0) {
      // L'utilisateur n'existe pas ou les identifiants sont incorrects
      return res.status(401).json({ error: true, message: "Identifiants incorrects." });
    }

    const user = result.rows[0];

    // Succès : Renvoyer les données utilisateur
    console.log("Type d'utilisateur :", user.typeuser);
    res.status(200).json({
      error: false,
      message: "Connexion réussie !",
      typeUser: user.typeuser,
    });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error.message);
    res.status(500).json({ error: true, message: "Une erreur est survenue." });
  }
});

app.post("/Enregistre", async (req, res) => {
  const { email, pwd, nom, prenom, genre,typeUser } = req.body;

  if (!email || !pwd || !nom || !prenom || !genre||!typeUser) {
    return res.status(400).send("Tous les champs sont requis.");
  }

  try {
    const sql =
      "INSERT INTO utilisateur (email, pwd, nom, prenom, genre,typeUser) VALUES ($1, $2, $3, $4, $5,$6)";
    await pool.query(sql, [email, pwd, nom, prenom, genre,typeUser]);
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


app.get("/Utilisateur", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.prenom, u.nom, u.email, u.niveau, array_agg(r.reponse) AS questions
      FROM utilisateurs u
      LEFT JOIN reponses r ON u.id = r.id_utilisateur
      GROUP BY u.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});



// Lancer le serveur
app.listen(port, () => console.log(`App listening on port ${port}`));
