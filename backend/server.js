import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js';

dotenv.config()

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors("*"))
app.use(express.json("limit: 10mb")) // Parse JSON bodies
app.use(express.urlencoded({ extended: true }))     // Parse URL-encoded bodies



app.use("/api", routes)

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    }); 