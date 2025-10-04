import express from "express";
import axios from "axios";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index.ejs", { shloka: [] });
});

app.post("/data", async (req, res) => {
  const chapter = req.body.chapter;
  const verse = req.body.verse;
  let shloka = [];

  try {
    if (chapter) {
      if (verse === "0" || !verse) {
        // Fetch all shlokas from the chapter
        const response = await axios.get(`https://geeta-api.vercel.app/shlok/${chapter}`);
        shloka = response.data;
      } else {
        // Fetch specific shloka
        const response = await axios.get(`https://geeta-api.vercel.app/shlok/${chapter}/${verse}`);
        shloka = [response.data];
      }
    }

    res.render("index.ejs", {shloka: shloka, error: null});
  } catch (error) {
    // If the API throws a 404 error (invalid verse), render with error message
    res.render("index.ejs", {
      shloka: [],
      error: "Verse does not exist for this chapter.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
