import express from "express";
import pool from "./db.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.urlencoded({ extended: true }));
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

// GET /posts/:id/edit — show edit form
app.get("/posts/:id/edit", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM posts WHERE id = $1",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).render("404");
    res.render("edit", { post: rows[0], errors: [] });
  } catch (err) {
    console.error("GET /posts/:id/edit error:", err);
    res.status(500).send("Database error.");
  }
});

// POST /posts/:id/edit — update a post
app.post("/posts/:id/edit", async (req, res) => {
  const formData = getPostInput(req.body);
  const errors = validatePost(formData);

  if (errors.length > 0) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM posts WHERE id = $1",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).render("404");
      return res.status(400).render("edit", {
        post: { ...rows[0], ...formData },
        errors,
      });
    } catch (err) {
      console.error("POST /posts/:id/edit (validation re-render) error:", err);
      return res.status(500).send("Database error.");
    }
  }

  try {
    const result = await pool.query(
      "UPDATE posts SET title = $1, author = $2, content = $3 WHERE id = $4",
      [formData.title, formData.author, formData.content, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).render("404");
    res.redirect("/");
  } catch (err) {
    console.error("POST /posts/:id/edit error:", err);
    res.status(500).send("Could not update post.");
  }
});

// POST /posts/:id/delete — delete a post
app.post("/posts/:id/delete", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM posts WHERE id = $1",
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).render("404");
    res.redirect("/");
  } catch (err) {
    console.error("POST /posts/:id/delete error:", err);
    res.status(500).send("Could not delete post.");
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
