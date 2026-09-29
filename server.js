import express from "express";
import pool from "./db.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// ---------- helpers ----------

function getPostInput(body) {
  return {
    title: body.title?.trim() ?? "",
    author: body.author?.trim() ?? "",
    content: body.content?.trim() ?? "",
  };
}

function validatePost(post) {
  const errors = [];
  if (!post.title) errors.push("Add a title to your post.");
  if (!post.author) errors.push("Add your name as the author.");
  if (!post.content) errors.push("Write something before publishing.");
  return errors;
}

function renderDate(date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

app.locals.formatDate = renderDate;

// ---------- routes ----------

// GET / — list all posts
app.get("/", async (req, res) => {
  try {
    const { rows: posts } = await pool.query(
      "SELECT * FROM posts ORDER BY created_at DESC"
    );
    res.render("index", {
      posts,
      formData: { title: "", author: "", content: "" },
      errors: [],
    });
  } catch (err) {
    console.error("GET / error:", err);
    res.status(500).send("Database error – please try again later.");
  }
});

// POST /posts — create a new post
app.post("/posts", async (req, res) => {
  const formData = getPostInput(req.body);
  const errors = validatePost(formData);

  if (errors.length > 0) {
    try {
      const { rows: posts } = await pool.query(
        "SELECT * FROM posts ORDER BY created_at DESC"
      );
      return res.status(400).render("index", { posts, formData, errors });
    } catch (err) {
      console.error("POST /posts (validation re-render) error:", err);
      return res.status(500).send("Database error.");
    }
  }

  try {
    await pool.query(
      "INSERT INTO posts (title, author, content) VALUES ($1, $2, $3)",
      [formData.title, formData.author, formData.content]
    );
    res.redirect("/");
  } catch (err) {
    console.error("POST /posts error:", err);
    res.status(500).send("Could not save post.");
  }
});



// GET /posts/:id — view a single post
app.get("/posts/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM posts WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).render("404");
    res.render("post", { post: rows[0] });
  } catch (err) {
    console.error("GET /posts/:id error:", err);
    res.status(500).send("Database error.");
  }
});

// GET /search — search posts by title, author, or content
app.get("/search", async (req, res) => {
  const query = (req.query.q || "").trim();
  try {
    let posts = [];
    if (query) {
      const { rows } = await pool.query(
        `SELECT * FROM posts
         WHERE title ILIKE $1
            OR author ILIKE $1
            OR content ILIKE $1
         ORDER BY created_at DESC`,
        [`%${query}%`]
      );
      posts = rows;
    }
    res.render("search", { posts, query });
  } catch (err) {
    console.error("GET /search error:", err);
    res.status(500).send("Database error.");
  }
});

// GET /about — about page
app.get("/about", (req, res) => {
  res.render("about");
});

// ---------- JSON API (used by index.html) ----------

// GET /api/posts — return all posts as JSON
app.get("/api/posts", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM posts ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /api/posts error:", err);
    res.status(500).json({ error: "Database error." });
  }
});

// POST /api/posts — create a post, return the new row as JSON
app.post("/api/posts", async (req, res) => {
  const { title, author, content } = req.body;
  if (!title?.trim() || !author?.trim() || !content?.trim()) {
    return res.status(400).json({ error: "Title, author, and content are all required." });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO posts (title, author, content) VALUES ($1, $2, $3) RETURNING *",
      [title.trim(), author.trim(), content.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/posts error:", err);
    res.status(500).json({ error: "Could not save post." });
  }
});



// 404 catch-all
app.use((req, res) => {
  res.status(404).render("404");
});

// ---------- start ----------

app.listen(port, () => {
  console.log(`Blog running at http://localhost:${port}`);
});
