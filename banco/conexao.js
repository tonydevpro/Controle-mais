require('dotenv').config();
const mysql = require('mysql2/promise');


    const conectar = mysql.createPool({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT
    });

    console.log('✅ MySQL conectado com sucesso!');

module.exports = conectar;
