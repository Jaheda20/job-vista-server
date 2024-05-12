const express = require('express');
const cors = require('cors');
const app = express();
const port =process.env.PORT || 3000;
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
    
    const jobsCollection = client.db('jobVista').collection('jobs');
    const applicationsCollection = client.db('jobVista').collection('applications');



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

    app.get('/myJobs/:email', async(req, res)=>{
        const email = req.params.email;
        console.log(email);
        const query = {'recruiter.email': email}
        const myListedJobs = await jobsCollection.find(query).toArray();
        res.send(myListedJobs)

    })

    // job applications related api

    app.post('/application', async(req, res)=>{
        const applicationData = req.body;
        console.log(applicationData);

        const query = {
            email: applicationData.email,
            jobId: applicationData.jobId,
        }
        const alreadyApplied = await applicationsCollection.findOne(query)
        if(alreadyApplied){
            return res
            .status(400)
            .send("You've already applied for the position")
        }
        const result = await applicationsCollection.insertOne(applicationData)
        // update applicants count in db
        const updateDoc = {
            $inc: {applicants_count: 1}
        }
        const jobQuery = {_id: new ObjectId(applicationData.jobId)}
        const updateCount = await jobsCollection.updateOne(jobQuery, updateDoc)
        console.log(updateCount)
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