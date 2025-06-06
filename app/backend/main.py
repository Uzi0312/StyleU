from flask import Flask, request, jsonify
from flask_cors import CORS
from torchvision import models, transforms
import torch.nn as nn
from PIL import Image
import torch
from utils import find_similar, embeddings, analyze_with_gemini, trend_awareness
import os


app = Flask(__name__)
CORS(app)

# Load ResNet50
base_model = models.resnet50(pretrained=True)
model = nn.Sequential(*list(base_model.children())[:-1])  # remove the last FC layer
model.eval()

# Preprocessing
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


# Search function
@app.route("/search", methods=["POST"])
def search():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_file = request.files["image"]
    image = Image.open(image_file.stream).convert("RGB")
    input_tensor = preprocess(image).unsqueeze(0) # shape: [1, 3, 224, 224]

    with torch.no_grad():
        query_embedding = model(input_tensor).view(-1) # Ensures shape [2048]

    similar_items = find_similar(query_embedding, top_k=6)

    results = []
    for idx, (pid, score) in enumerate(similar_items):
        meta = embeddings[pid]
        trend = trend_awareness(meta["launch_on"], meta["last_seen_date"], meta["discount"])
        item = {
            "product_id": pid,
            "score": round(score, 4),
            "url": meta["url"],
            "trend_score": trend
        }
        if idx == 0:
            uploaded = item
        else:
            results.append(item)

    return jsonify({"uploaded": uploaded, "results": results})

# Recommendation engine
@app.route("/recommendations", methods=["POST"])
def recommendations():
    data = request.get_json()
    history = data.get("history", [])

    if not history:
        return jsonify({"error": "No history provided"}), 400  # If no history found to suggests similar items

    recommended = {}
    for pid in history:
        if pid not in embeddings:
            continue
        emb = embeddings[pid]['embedding']
        similar = find_similar(emb, top_k=14)  # Getting top 8 similar items per history item
        for rec_pid, score in similar:
            if rec_pid not in history:
                recommended[rec_pid] = recommended.get(rec_pid, 0) + score  # Aggregating scores

    # Sort recommendations by aggregated score
    recommended = sorted(recommended.items(), key=lambda x: x[1], reverse=True)

    # Limit number of recommendations
    recommended = recommended[:14]

    results = []
    for pid, score in recommended:
        meta = embeddings[pid]
        trend = trend_awareness(meta["launch_on"], meta["last_seen_date"], meta["discount"])
        results.append({
            "product_id": pid,
            "score": round(score, 2),
            "url": meta["url"],
            "trend_score": trend  
        })
    return jsonify({"results": results})

# Outfit suggestions
@app.route("/analyze", methods=["POST"])
def analyze():
    image = request.files["image"]
    image_bytes = image.read()
    
    try:
        description, suggestions = analyze_with_gemini(image_bytes)
        return jsonify({"description": description, "suggestions": suggestions})
    except Exception as e:
        print(f"Error in analyze: {e}")
        return jsonify({"error": "Failed to analyze image"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))  # Cloud Run expects 8080
    app.run(host="0.0.0.0", port=port)

