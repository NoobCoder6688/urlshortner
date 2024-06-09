var express = require("express");
var cors = require("cors");
var mongoose = require("mongoose");
var dns = require("dns");
var urlParser = require("url");
require("dotenv").config();

var app = express();

app.use(cors());
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("MongoDB URI not provided in .env file");
  process.exit(1);
}

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

// Define URL schema and model
const { Url, Counter } = require("./models");

// Function to get the next sequence value for the short URL
const getNextSequenceValue = async (sequenceName) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// POST endpoint to shorten URL
app.post("/api/shorturl", async (req, res) => {
  const { url } = req.body;

  // Validate the URL
  const parsedUrl = urlParser.parse(url);
  if (!parsedUrl.hostname) {
    return res.json({ error: "invalid url" });
  }

  dns.lookup(parsedUrl.hostname, async (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    }

    try {
      // Check if the URL already exists in the database
      let existingUrl = await Url.findOne({ original_url: url });
      if (existingUrl) {
        return res.json({
          original_url: existingUrl.original_url,
          short_url: existingUrl.short_url,
        });
      }

      // Generate a new short URL
      const shortUrl = await getNextSequenceValue("shorturlid");
      const newUrl = new Url({ original_url: url, short_url: shortUrl });
      await newUrl.save();

      res.json({
        original_url: newUrl.original_url,
        short_url: newUrl.short_url,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json("Server error");
    }
  });
});

// GET endpoint to redirect to the original URL
app.get("/api/shorturl/:short_url", async (req, res) => {
  try {
    const url = await Url.findOne({ short_url: req.params.short_url });
    if (url) {
      return res.redirect(url.original_url);
    } else {
      return res
        .status(404)
        .json({ error: "No short URL found for the given input" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Your app is listening on port " + port);
});
