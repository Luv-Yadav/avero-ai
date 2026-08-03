const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use(express.static(__dirname));

app.post("/chat", async (req, res) => {
  try {
const message = req.body.message || "";
const image = req.body.image || null;
const history = Array.isArray(req.body.history)
  ? req.body.history
  : [];
    if (!message && !image) {
      return res.status(400).json({
        error: "Message or image is required"
      });
    }

    // =========================
    // GEMINI
    // =========================

    const parts = [];

    if (message) {
      parts.push({
        text: message
      });
    }

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

    try {
      console.log("Trying Gemini...");

      const geminiResponse = await fetch(
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
                  text: "Your name is Avero. You are Avero AI. You were created by Luv Yadav, and your owner is Luv Yadav. If someone asks your name, always say your name is Avero. If someone asks who created you or who your owner is, always say Luv Yadav."
                }
              ]
            },

contents: [
  ...history
    .filter(item => item.role === "user" || item.role === "ai")
    .map(item => ({
      role: item.role === "ai" ? "model" : "user",
      parts: [
        {
          text: item.text
        }
      ]
    })),

  {
    role: "user",
    parts: parts
  }
]
          })
        }
      );

      const geminiData =
        await geminiResponse.json();

      console.log(
        "Gemini response:",
        JSON.stringify(geminiData, null, 2)
      );

      if (geminiResponse.ok) {
        const reply =
          geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Sorry, I could not generate a response.";

        return res.json({
          reply: reply
        });
      }

      console.log(
        "Gemini failed. Switching to Groq..."
      );

    } catch (geminiError) {

      console.log(
        "Gemini error. Switching to Groq..."
      );

    }


    // =========================
    // GROQ FALLBACK
    // =========================

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY is missing."
      });
    }

// Groq Vision fallback
let groqContent = [];

if (message) {
  groqContent.push({
    type: "text",
    text: message
  });
}

if (image) {
  groqContent.push({
    type: "image_url",
    image_url: {
      url: image
    }
  });
}

    console.log(
      "Trying Groq fallback..."
    );

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Bearer " +
            process.env.GROQ_API_KEY
        },

        body: JSON.stringify({
model: "qwen/qwen3.6-27b",

          messages: [
            {
              role: "system",

              content:
                "Your name is Avero. You are Avero AI. You were created by Luv Yadav, and your owner is Luv Yadav. If someone asks your name, always say your name is Avero. If someone asks who created you or who your owner is, always say Luv Yadav."
            },

            {
...history
  .filter(item => item.role === "user" || item.role === "ai")
  .map(item => ({
    role: item.role === "ai"
      ? "assistant"
      : "user",
    content: item.text
  })),

{
  role: "user",
  content: groqContent
}
          ]
        })
      }
    );

    const groqData =
      await groqResponse.json();

    console.log(
      "Groq response:",
      JSON.stringify(groqData, null, 2)
    );

    if (!groqResponse.ok) {
      return res.status(
        groqResponse.status
      ).json({
        error:
          "Both Gemini and Groq failed.",
        details:
          groqData
      });
    }

let groqReply =
  groqData.choices?.[0]?.message?.content ||
  "Sorry, I could not generate a response.";

groqReply = groqReply
  .replace(/<think>[\s\S]*?<\/think>/gi, "")
  .trim();
    return res.json({
      reply: groqReply
    });

  } catch (error) {

    console.error(
      "Server Error:",
      error
    );

    res.status(500).json({
      error:
        "Something went wrong",
      details:
        error.message
    });

  }
});

app.listen(
  3000,
  () => {
    console.log(
      "Avero AI backend running on http://localhost:3000"
    );
  }
);
