require('dotenv').config({ path: './config.env' });

const app = require('./app');
const connectDB = require('./db');

connectDB();

process.on('uncaughtException', (err) => { 
    console.error(err.name, err.message);
    console.log('UNHANDELED EXCEPTION! 💥 SHUTING DOWN...');
    process.exit(1);
});


const port = process.env.PORT || 3000; // Note: `PORT` should be uppercase

const server = app.listen(port, '127.0.0.1', () => { 
    console.log(`App running on port ${port}...`);    
});

process.on('unhandledRejection', (err) => { 
    // console.log(err.name, err.message); 

    console.log('UNHANDELED REJECTION! 💥 SHUTING DOWN...');

    // Optionally, you can shut down the server here
    server.close(() => {
        process.exit(1); // Optional: Exit the process if this is a critical error
    });
}); 


