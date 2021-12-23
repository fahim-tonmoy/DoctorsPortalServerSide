const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
const { MongoClient } = require('mongodb');
require ('dotenv').config();


const app = express();
const port = process.env.PORT || 5000;
// doctorsportal-702b0-firebase-adminsdk-fjxms-8ab8fe7081.json

// middleware
app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// const serviceAccount = require('./doctorsportal-702b0-firebase-adminsdk-fjxms-8ab8fe7081.json');
// const serviceAccount = {
//   type: process.env.FIREBASE_SERVICE_ACCOUNT_TYPE,
//   project_id: process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID ,
//   private_key_id: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID ,
//   private_key: process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
//   client_email: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL ,
//   client_id: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_ID ,
//   auth_uri: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_URI ,
//   token_uri: process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN_URI ,
//   auth_provider_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL ,
//   client_x509_cert_url: process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL ,
// };


// console.log(serviceAccount);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Db connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lcafd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// token verification
async function verifyToken (req, res, next) {
  if(req.headers.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];
      try{
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedEmail = decodedUser.email;
      }
      catch{}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    // console.log('database connected successfully');
    
    // database
    const database = client.db('doctorsPortal');

    //collection
    const appointmentsCollection = database.collection('appointments'); 
    const usersCollection = database.collection('users'); 


    // Api's
    // appointment get api
    app.get('/appointments', async function (req, res) {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();

      const query = { email: email, date: date };
      // console.log(query);s
      
      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
    })

    app.get('/users/:email', async(req, res) => {
      const email = req.params.email;
      const query =  { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if(user?.role === 'admin'){
        isAdmin= true;
      }
      res.json({ admin: isAdmin })
    })

    // appointment post api
    app.post('/appointments',verifyToken, async function (req, res) {
      const appointment = req.body;
      // console.log(appointment);
      const result = await appointmentsCollection.insertOne(appointment);
      res.json(result);
    })

    // users post api
    app.post('/users', async function (req, res) {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    })

    app.put('/users', async(req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const option = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(filter, updateDoc, option);
      res.json(result);
    })

    app.put('/users/admin', verifyToken, async(req, res) =>{
      const user = req.body;
      const requester = req.decodedEmail;
      if(requester){
        const reqursterAccount = await usersCollection.findOne({ email: requester });
        if(reqursterAccount.role === 'admin') {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: 'admin'} };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      }
      else {
        res.status(403).json({ message: "you don't have access to make an admin!!"});
      }
    })
  }
  finally {
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => res.send('Hello DoctorsPortal!'))
app.listen(port, () => console.log(`DoctorsPortal app listening on port ${port}!`))




// "type": ,
//   "project_id": ,
//   "private_key_id": ,
//   "private_key": ,
//   "client_email": ,
//   "client_id": ,
//   "auth_uri": ,
//   "token_uri": ,
//   "auth_provider_x509_cert_url": ,
//   "client_x509_cert_url": ,