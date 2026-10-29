require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 5000;
const DB_NAME =
  process.env.DB_NAME || "236011_LeHoangKhanhVinh";

app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("CORS origin not allowed"));
  }
}));

let foods;
let client;

const fields = [
  "foodId",
  "name",
  "category",
  "cuisine",
  "ingredients",
  "price",
  "quantity",
  "description",
  "imageUrl"
];

function validateFood(data, partial = false) {
  if (!data || typeof data !== "object" ||
      Array.isArray(data)) {
    return "Du lieu khong hop le";
  }

  if (Object.keys(data).some(
    key => !fields.includes(key)
  )) {
    return "Du lieu chua truong khong hop le";
  }

  const required = [
    "foodId",
    "name",
    "category",
    "cuisine",
    "ingredients",
    "price",
    "quantity"
  ];

  if (!partial) {
    for (const field of required) {
      if (data[field] === undefined ||
          data[field] === null) {
        return `Thieu truong ${field}`;
      }
    }
  }

  for (const field of [
    "foodId",
    "name",
    "category",
    "cuisine"
  ]) {
    if (data[field] !== undefined &&
        (typeof data[field] !== "string" ||
         !data[field].trim())) {
      return `${field} phai la chuoi khong rong`;
    }
  }

  for (const field of ["description", "imageUrl"]) {
    if (data[field] !== undefined &&
        typeof data[field] !== "string") {
      return `${field} phai la chuoi`;
    }
  }

  if (data.ingredients !== undefined &&
      (!Array.isArray(data.ingredients) ||
       data.ingredients.some(
         x => typeof x !== "string" || !x.trim()
       ))) {
    return "ingredients phai la mang chuoi";
  }

  if (data.price !== undefined &&
      (typeof data.price !== "number" ||
       !Number.isFinite(data.price) ||
       data.price < 0)) {
    return "Gia ban khong hop le";
  }

  if (data.quantity !== undefined &&
      (!Number.isInteger(data.quantity) ||
       data.quantity < 0)) {
    return "So luong khong hop le";
  }

  return null;
}

function getId(id) {
  return ObjectId.isValid(id) &&
    /^[0-9a-fA-F]{24}$/.test(id)
      ? new ObjectId(id)
      : null;
}

// HEALTH CHECK
app.get("/health", async (req, res) => {
  try {
    await client.db("admin").command({ ping: 1 });

    res.json({
      status: "OK",
      database: "connected"
    });
  } catch {
    res.status(503).json({
      status: "ERROR",
      database: "disconnected"
    });
  }
});

// GET ALL + SEARCH
app.get("/api/foods", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const query = search
      ? {
          $or: [
            { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { category: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            { cuisine: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
          ]
        }
      : {};

    const data = await foods.find(query).toArray();

    res.json(data);
  } catch (err) {
    res.status(500).json({
      message: "Loi lay danh sach mon an"
    });
  }
});

// GET DETAIL
app.get("/api/foods/:id", async (req, res) => {
  try {
    const _id = getId(req.params.id);

    if (!_id) {
      return res.status(400).json({
        message: "ID khong hop le"
      });
    }

    const food = await foods.findOne({ _id });

    if (!food) {
      return res.status(404).json({
        message: "Khong tim thay mon an"
      });
    }

    res.json(food);
  } catch {
    res.status(500).json({
      message: "Loi lay chi tiet"
    });
  }
});

// CREATE
app.post("/api/foods", async (req, res) => {
  try {
    const error = validateFood(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const result = await foods.insertOne(req.body);

    res.status(201).json({
      _id: result.insertedId,
      ...req.body
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Ma mon an da ton tai"
      });
    }

    res.status(500).json({
      message: "Loi them mon an"
    });
  }
});

// UPDATE
app.put("/api/foods/:id", async (req, res) => {
  try {
    const _id = getId(req.params.id);

    if (!_id) {
      return res.status(400).json({
        message: "ID khong hop le"
      });
    }

    const error = validateFood(req.body, true);

    if (error) {
      return res.status(400).json({ message: error });
    }

    if (!Object.keys(req.body).length) {
      return res.status(400).json({
        message: "Khong co du lieu cap nhat"
      });
    }

    const result = await foods.findOneAndUpdate(
      { _id },
      { $set: req.body },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({
        message: "Khong tim thay mon an"
      });
    }

    res.json(result);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Ma mon an da ton tai"
      });
    }

    res.status(500).json({
      message: "Loi cap nhat"
    });
  }
});

// DELETE
app.delete("/api/foods/:id", async (req, res) => {
  try {
    const _id = getId(req.params.id);

    if (!_id) {
      return res.status(400).json({
        message: "ID khong hop le"
      });
    }

    const result = await foods.deleteOne({ _id });

    if (!result.deletedCount) {
      return res.status(404).json({
        message: "Khong tim thay mon an"
      });
    }

    res.json({
      message: "Xoa mon an thanh cong"
    });
  } catch {
    res.status(500).json({
      message: "Loi xoa mon an"
    });
  }
});

// START SERVER
async function start() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("Missing MONGODB_URI");
    }

    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });

    await client.connect();

    const db = client.db(DB_NAME);
    foods = db.collection("foods");

    await foods.createIndex(
      { foodId: 1 },
      { unique: true }
    );

    console.log("MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
}

start();