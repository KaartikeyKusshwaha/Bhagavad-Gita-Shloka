import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000; // Vercel assigns port dynamically

// Serve static files from public/
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Set view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Home route
app.get("/", (req, res) => {
  res.render("index", { shloka: [], error: null });
});

// POST route to fetch shloka
app.post("/data", async (req, res) => {
  const chapter = req.body.chapter;
  const verse = req.body.verse;
  let shloka = [];

  try {
    if (chapter) {
      if (!verse || verse === "0") {
        // Fetch all shlokas from the chapter
        const response = await axios.get(`https://geeta-api.vercel.app/shlok/${chapter}`);
        shloka = response.data;
      } else {
        // Fetch specific shloka
        const response = await axios.get(`https://geeta-api.vercel.app/shlok/${chapter}/${verse}`);
        shloka = [response.data];
      }
    }

    res.render("index", { shloka, error: null });
  } catch (error) {
    res.render("index", { shloka: [], error: "Verse does not exist for this chapter." });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});