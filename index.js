const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const corsOptions = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://earnest-pastelito-76dcda.netlify.app',
        
    ],
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())

// middleware

const logger = (req, res, next) => {
    console.log('log info', req.method, req.url)
    next()
}

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    console.log('token in the middleware', token)
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                console.log(err)
                return res.status(401).send({ message: 'Unauthorized access' })
            }
            req.user = decoded;
            next()
        })
    }
}

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

        // auth related API
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log('user for token', user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true });
        })

        app.get('/logout', (req, res) => {
            const user = req.body;
            console.log('logged out user', user)
            res
            .clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0,
              })
                .send({ success: true })
        })


        // jobs related API
        app.get('/jobs', async (req, res) => {
            const cursor = jobsCollection.find();
            const allJobs = await cursor.toArray();
            res.send(allJobs)
        })

        app.get('/job/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(query);
            res.send(result)
        })

        app.post('/addJob', async (req, res) => {
            const job = req.body;
            console.log(job)
            const result = await jobsCollection.insertOne(job)
            res.send(result)
        })

        app.get('/myJobs/:email', logger, verifyToken, async (req, res) => {
            const tokenEmail = req.user.email;
            const email = req.params.email;
            console.log(email);
            console.log('token owner info', req.user)
            if (tokenEmail !== email) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            const query = { 'recruiter.email': email }
            const myListedJobs = await jobsCollection.find(query).toArray();
            res.send(myListedJobs)

        })

        app.put('/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedJobData = req.body;
            console.log(updatedJobData)
            const updateJob = {
                $set: {
                    photo: updatedJobData.photo,
                    jobTitle: updatedJobData.jobTitle,
                    company: updatedJobData.company,
                    jobCategory: updatedJobData.jobCategory,
                    jobDescription: updatedJobData.jobDescription,
                    minSalary: updatedJobData.minSalary,
                    maxSalary: updatedJobData.maxSalary,
                    publishedDate: updatedJobData.publishedDate,
                    deadLine: updatedJobData.deadLine,
                    applicants_count: updatedJobData.applicants_count

                }
            }
            // console.log(updateJob)
            const result = await jobsCollection.updateOne(query, updateJob, options);
            res.send(result)
        })

        app.delete('/deleteJob/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.deleteOne(query)
            res.send(result)
        })

        // job applications related api

        app.post('/application', async (req, res) => {
            const applicationData = req.body;
            console.log(applicationData);
            const query = {
                email: applicationData.email,
                jobId: applicationData.jobId,
            }
            const alreadyApplied = await applicationsCollection.findOne(query)
            if (alreadyApplied) {
                return res
                    .status(400)
                    .send("You've already applied for the position")
            }
            const result = await applicationsCollection.insertOne(applicationData)
            // update applicants count in db
            const updateDoc = {
                $inc: { applicants_count: 1 }
            }
            const jobQuery = { _id: new ObjectId(applicationData.jobId) }
            const updateCount = await jobsCollection.updateOne(jobQuery, updateDoc)
            console.log(updateCount)
            res.send(result)
        })

        app.get('/appliedJobs/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = { email };
            console.log('token owner info', req.user)
            
            const filter = req.query.filter;
            console.log(filter)
            if (filter) query.appliedJobCategory = filter;
            const result = await applicationsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/allJobs', async (req, res) => {
            const search = req.query.search;
            let query = {
                jobTitle: { $regex: search, $options: 'i' }
            }
            const result = await jobsCollection.find(query).toArray();
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Job vista is running')
})

app.listen(port, () => {
    console.log(`Job Vista is running on port ${port}`)
})