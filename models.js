const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true },
});

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Url = mongoose.model("Url", urlSchema);
const Counter = mongoose.model("Counter", counterSchema);

module.exports = { Url, Counter };
