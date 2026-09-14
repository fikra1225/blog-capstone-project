import express from "express";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// --- Persistent storage helpers ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "posts.json");

const DEFAULT_POSTS = [
  {
    id: randomUUID(),
    title: "A slower way to start the day",
    author: "Alex Morgan",
    content:
      "The best ideas rarely arrive on demand. I have started leaving the first hour of my morning open for reading, walking, and noticing what feels interesting before the day gets noisy.",
    createdAt: new Date("2026-01-18T09:00:00").toISOString(),
  },
  {
    id: randomUUID(),
    title: "Notes from a curious week",
    author: "Alex Morgan",
    content:
      "This week I learned that small experiments are easier to finish than ambitious plans. A little progress, written down, becomes a trail you can follow.",
    createdAt: new Date("2026-01-12T09:00:00").toISOString(),
  },
];

function loadPosts() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_POSTS, null, 2));
    return DEFAULT_POSTS.map((p) => ({ ...p, createdAt: new Date(p.createdAt) }));
  }
  const raw = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  return raw.map((p) => ({ ...p, createdAt: new Date(p.createdAt) }));
}

function savePosts(posts) {
  const serializable = posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));
  writeFileSync(DATA_FILE, JSON.stringify(serializable, null, 2));
}

const posts = loadPosts();

function findPost(id) {
  return posts.find((post) => post.id === id);
}

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
  }).format(date);
}

app.locals.formatDate = renderDate;

app.get("/", (req, res) => {
  res.render("index", {
    posts,
    formData: { title: "", author: "", content: "" },
    errors: [],
  });
});

app.post("/posts", (req, res) => {
  const formData = getPostInput(req.body);
  const errors = validatePost(formData);

  if (errors.length > 0) {
    return res.status(400).render("index", { posts, formData, errors });
  }

  posts.unshift({
    id: randomUUID(),
    ...formData,
    createdAt: new Date(),
  });
  savePosts(posts);
  res.redirect("/");
});

app.get("/posts/:id/edit", (req, res) => {
  const post = findPost(req.params.id);
  if (!post) return res.status(404).render("404");
  res.render("edit", { post, errors: [] });
});

app.post("/posts/:id/edit", (req, res) => {
  const post = findPost(req.params.id);
  if (!post) return res.status(404).render("404");

  const formData = getPostInput(req.body);
  const errors = validatePost(formData);
  if (errors.length > 0) {
    return res.status(400).render("edit", {
      post: { ...post, ...formData },
      errors,
    });
  }

  Object.assign(post, formData);
  savePosts(posts);
  res.redirect("/");
});

app.post("/posts/:id/delete", (req, res) => {
  const postIndex = posts.findIndex((post) => post.id === req.params.id);
  if (postIndex === -1) return res.status(404).render("404");
  posts.splice(postIndex, 1);
  savePosts(posts);
  res.redirect("/");
});

app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(port, () => {
  console.log(`Blog running at http://localhost:${port}`);
});
