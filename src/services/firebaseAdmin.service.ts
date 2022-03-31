var admin = require("firebase-admin");

var serviceAccount = require("../constants/lang-track-app-firebase-adminsdk-862cg-a80a5de2fc.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://lang-track-app.firebaseio.com"
})

export default admin;