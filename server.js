const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());

// Text + Image data के लिए बड़ा limit
app.use(express.json({ limit: "20mb" }));

// Avero frontend
app.use(express.static(__dirname));

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message || "";
    const image = req.body.image || null;

    // Text और image दोनों नहीं हैं
    if (!message && !image) {
      return res.status(400).json({
        error: "Message or image is required"
      });
    }

    const parts = [];

    // Text जोड़ना
    if (message) {
      parts.push({
        text: message
      });
    }

    // Image जोड़ना
    if (image) {
      const matches = image.match(
        /^data:(.+);base64,(.+)$/
      );

      if (!matches) {
        return res.status(400).json({
          error: "Invalid image format"
        });
      }

      parts.push({
        inline_data: {
          mime_type: matches[1],
          data: matches[2]
        }
      });
    }

    // Gemini API को request
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          systemInstruction: {
  parts: [
    {
      text: "Your name is Avero. You are Avero AI. If someone asks your name, always say your name is Avero."
    }
  ]
},
          contents: [
            {
              parts: parts
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log(
      "Gemini API response:",
      JSON.stringify(data, null, 2)
    );

    // Gemini API error
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // AI का जवाब
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I could not generate a response.";

    res.json({
      reply: reply
    });

  } catch (error) {

    console.error(
      "Server Error:",
      error
    );

    res.status(500).json({
      error: "Something went wrong",
      details: error.message
    });

  }
});

app.listen(3000, () => {
  console.log(
    "Avero AI backend running on http://localhost:3000"
  );
});
