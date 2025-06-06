StyleU – AI-Powered Visual Search & Fashion Recommendation System

StyleU is a full-stack prototype built for Stylumia's take-home challenge. It enables **visual fashion search**, provides **personalized outfit recommendations**, and includes trend awareness intelligence — all through an intuitive web interface.

---

PROJECT OVERVIEW

## Problem Statement

65% of fashion e-commerce users abandon their journey because they can't find what they're looking for — largely due to poor text-based search. **StyleU** solves this by:

- Accepting an **uploaded fashion image**.
- Finding **visually similar products**.
- Suggesting **intelligent outfit/accessory recommendations**.
- Incorporating **trend-awareness** in all recommendations.


## Key Features & Solutions

### 1. Visual Similarity Search (via `image_embeddings.pt`)
- A preprocessed `.pt` file (`image_embeddings.pt`) contains feature embeddings (vectors) for all catalog products.
- These embeddings are generated using a ResNet50 model (excluding its final classification layer), so each product is represented by a 2048-dimensional vector.
- On app startup:
  - This file is loaded into memory using PyTorch (`torch.load`).
  - Embeddings are normalized for cosine similarity comparisons.
- When a user uploads an image:
  - The same ResNet50 pipeline is applied to generate a query embedding.
  - Cosine similarity is computed between the query and all entries in `image_embeddings.pt`.
  - The top matches are returned as visually similar products.

### 2. Trend Awareness Scoring
Each product (either in search results or recommendations) is assigned a *trend score* that reflects how relevant it is in the current market context. This score is derived from a combination of metadata values:

- **Recency** — how recently the product was launched (`launch_on`)
- **Freshness** — how recently it was seen on the platform (`last_seen_date`)
- **Discount** — the current discount applied to the product (`discount`)

**Formula:**

trend_score = (recency * 0.4) + (freshness * 0.4) + (1 - discount%) * 0.2

Trend icons (📈 / 📉) are displayed next to each product to indicate whether it's currently in trend or falling out of fashion.


### 3. Personalized Recommendations
The application keeps track of the user’s interaction history (specifically, product IDs from past searches). After at least **3 image searches**, a set of **personalized recommendations** is generated.

- Embeddings of history items are retrieved from `image_embeddings.pt`
- Similar products are found for each history item
- Already seen items are filtered out
- Scores are **aggregated** to prioritize the most relevant recommendations

This allows StyleU to evolve with the user’s visual preferences over time.


### 4. Gemini-Powered Outfit Suggestions
StyleU integrates the **Google Gemini 1.5 Flash API** to provide intelligent, generative outfit insights.

When a user uploads an image:
- Gemini analyzes the visual content
- Generates a **clean, concise description** of the outfit/item
- Recommends **three accessories** that complement the uploaded item

These suggestions add semantic depth to the visual match and offer styling inspiration.

The project was made using Python (Flask) & React

Author: Mohammed Uzair

To use: 
Step 1: Download all code files (backend & frontend) & install all dependencies.
Step 2: Run the main.py to launch your backend.
Step 3: open cmd/terminal and go to the dir with your frontend folder; assuming all dependencies are installed, type 'npm install' to configure your frontend. Once loaded type 'npm start' to launch your frontend. This will open the application on your web browser.
Step 4: choose a relevant file with some clothing (images can be uploaded from social media, gallery etc) then click on search. This returns a description of the item in image along with suggested add-ons. Clicking search also a returns a catlog on similar products found with similarity score below.
Note that recommendations are also shown once user has searched for 3+ items.

Things to know:
1. Recommendations keep refereshing after every search, it may take a few seconds to reflect
2. The same goes for the description and suggested add-ons, This however is quicker than the former.

