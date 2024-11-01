// db.js
import mysql from 'mysql2/promise'

const db = await mysql.createConnection({
    host: process.env.DB_HOST,  // Host proporcionado por Railway
    user: process.env.DB_USER,  // Usuario de la base de datos
    password: process.env.DB_PASSWORD,  // Contraseña de la base de datos
    database: process.env.DB_NAME  // Nombre de la base de datos
})

export default db
