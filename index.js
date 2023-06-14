const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

console.log(process.env.DB_USER)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7omvjfn.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //client.connect();
    const usersCollection = client.db("languageDb").collection("users");
    const paymentCollection = client.db("languageDb").collection("payments");
    const classCollection = client.db("languageDb").collection("classes");
    const cartCollection = client.db("languageDb").collection("carts");

    // create payment intent----------------------------------------------
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // users related apis-------------------------------------------------
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) return res.send({ message: 'user already exists' })

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //returns role of a user
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const role = user.role
      res.send(role);
    })

    //make admin or ins
    app.patch('/users/update/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateddoc = req.body;
      console.log('81 id: ',id);
      const updatedDoc = {
        $set: {
          ...updateddoc
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //class related api-------------------------------------------------
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get('/classes/:email', async (req, res) => {

      const email = req.params.email;
      if (!email) {
        res.send([]);
      }
      const query = { instructor: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
      
    });
    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(filter);
      res.send(result);
    });

    app.post('/classes', async (req, res) => {
      const newclass = req.body;
      const result = await classCollection.insertOne(newclass);
      res.send(result);
    });

    app.patch('/classes/:id', async (req, res) => {
      const classId = req.params.id;
      const classObj = await classCollection.findOne({ _id: new ObjectId(classId) });

      if (classObj) {
        // Calculate the updated values
        const updatedSeats = parseInt(classObj.availableSeats) - 1;
        const updatedStudents = parseInt(classObj.students) + 1;

        // Update the class with the new values
        const result = await classCollection.findOneAndUpdate(
          { _id: new ObjectId(classId) },
          {
            $set: {
              availableSeats: updatedSeats,
              students: updatedStudents
            }
          },
          { returnOriginal: false }
        );

        res.status(200).json({ message: 'Class updated successfully.', class: result.value });
      } else {
        res.status(404).json({ error: 'Class not found.' });
      }

    });

    //approved or deny class
    app.patch('/classes/update/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateddoc = req.body;
      console.log('171 id: ',id);
      const updatedDoc = {
        $set: {
          ...updateddoc
        }
      }
      const result = await classCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
  


    // cart apis---------------------------------------------
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })


    // payment related api--------------------------------------------------
    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });

    app.get('/payments/:email', async (req, res) => {
      const email = req.params.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      res.send({ result });
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {


  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('speakup running.......................')
})

app.listen(port, () => {
  console.log(`speakup running on port ${port}`);
})
