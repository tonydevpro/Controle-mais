// ARQUIVO: banco/conexao.js (COM DEBUG)
// ============================================

require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('\n🔍 [DATABASE] Conectando ao MySQL...');
console.log(`   ├─ Host: ${process.env.MYSQLHOST}`);
console.log(`   ├─ User: ${process.env.MYSQLUSER}`);
console.log(`   ├─ Database: ${process.env.MYSQLDATABASE}`);
console.log(`   └─ Port: ${process.env.MYSQLPORT}`);

const conectar = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('✅ MySQL pool criado com sucesso!');

module.exports = conectar;