const Pool =require("pg").Pool;

const pool= new Pool({
user:"postgres",
host:"localhost",
database:"postgres",
password:"selma",
port:"5433",
});

module.exports=pool;