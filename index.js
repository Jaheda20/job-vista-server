const express = require('express');
const cors = require('cors');
const app = express();
const port =process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const corsOptions ={
    origin: [
        'http://localhost:5173',
        'http://localhost:5174'
      ],
      credentials: true,
      optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.al6znur.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    const jobsCollection = client.db('jobVista').collection('jobs')



    // jobs related API
    app.get('/jobs', async(req, res)=>{
        const cursor = jobsCollection.find();
        const allJobs = await cursor.toArray();
        res.send(allJobs) 
    })

    app.get('/job/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await jobsCollection.findOne(query);
        res.send(result)
    })

    app.post('/addJob', async(req, res) => {
        const job = req.body;
        console.log(job)
        const result = await jobsCollection.insertOne(job)
        res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('Job vista is running')
})

app.listen(port, ()=>{
    console.log(`Job Vista is running on port ${port}`)
})