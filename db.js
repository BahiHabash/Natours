const mongoose = require('mongoose');

module.exports = function connectDB() {
    const DB = process.env.DATABASE.replace('<DB_PASSWORD>', process.env.DB_PASSWORD);

    mongoose
        .connect(DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        .then(() => console.log('DB Connected Successfuly 🔗'));
}