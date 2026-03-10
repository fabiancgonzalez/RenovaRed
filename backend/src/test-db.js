const { sequelize, User } = require('./models');

async function testConnection() {
  try {
    console.log('Probando conexion a la base de datos de RenovaRed');
    
    await sequelize.authenticate();
    console.log('Conexion establecida correctamente');
    
    const userCount = await User.count();
    console.log(`Total de usuarios en DB: ${userCount}`);
    
    console.log('Todo funcionando perfecto!');
    process.exit(0);
  } catch (error) {
    console.error('Error de conexion:', error);
    process.exit(1);
  }
}

testConnection();