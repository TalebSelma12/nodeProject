
const Pool=require('./db');


const getUsers=(req,res)=>{
    pool.query("SELECT * FROM users",(error,results))
}
module.exports={
    getUsers,
}