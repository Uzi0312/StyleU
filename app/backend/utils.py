import torch
import torch.nn.functional as F
from io import BytesIO
from PIL import Image
import google.generativeai as genai
from datetime import datetime
from dotenv import load_dotenv
import os


api_key = os.environ.get("GENAI_API_KEY")
# Configure Gemini
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

# Loading embeddings at startup
embeddings = torch.load("image_embeddings.pt")

# Converting embeddings dict to two tensors for fast computation
product_ids = list(embeddings.keys())
embedding_tensors = torch.stack([embeddings[pid]['embedding'] for pid in product_ids])
# Normalization
embedding_tensors = F.normalize(embedding_tensors, p=2, dim=1) 


#Function to find similar images
def find_similar(query_emb, top_k=5):
    from torch.nn.functional import cosine_similarity
    scores = []
    for pid, data in embeddings.items():
        emb = data["embedding"]
        score = cosine_similarity(query_emb.unsqueeze(0), emb.unsqueeze(0)).item()
        scores.append((pid, score))
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]

#For suggestions
def analyze_with_gemini(image_bytes):
    image = Image.open(BytesIO(image_bytes))

    prompt = "Describe this fashion item and suggest three accessories that go well with it. Don't add 'Here's a description of the fashion item and accessory suggestions'"

    response = model.generate_content([prompt, image])
    text = response.text.strip()

    # Parse the result (very basic parsing example)
    lines = text.split('\n')
    description = lines[0]
    suggestions = [line.strip("- ").strip() for line in lines[1:] if line]
    suggestions = [line.replace('*', '') for line in suggestions]

    return description, suggestions


def trend_awareness(launch_on, last_seen_date, discount):
    try:
        launch = datetime.strptime(launch_on, "%Y-%m-%d")
        seen = datetime.strptime(last_seen_date, "%Y-%m-%d")
        today = datetime.today()

        #Params
        recency = max(0, 1 - (today - launch).days / 365) #value between 0 & 1
        freshness = max(0, (today - seen).days <= 30)
        discount_penalty = 1 - (discount / 100)

        trend_score = (recency * 0.4) + (freshness * 0.4) + (discount_penalty * 0.2)
        return round(trend_score, 3)
    except:
        return 0.0
