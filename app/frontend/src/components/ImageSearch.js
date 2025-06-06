import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ImageSearch() {
  const [file, setFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchCount, setSearchCount] = useState(0);
  const [viewingImage, setViewingImage] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [uploadedTrendScore, setUploadedTrendScore] = useState(null); // NEW

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setAiSuggestions(null);
    setUploadedTrendScore(null);
    if (selectedFile) setFileURL(URL.createObjectURL(selectedFile));
  };

  useEffect(() => {
    return () => {
      if (fileURL) URL.revokeObjectURL(fileURL);
    };
  }, [fileURL]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    setAiSuggestions(null);

    try {
      const res = await axios.post('http://127.0.0.1:5000/search', formData);
      const { uploaded, results: matches } = res.data;
      setResults(matches);
      setUploadedTrendScore(uploaded.trend_score); // NEW

      setHistory((prev) => {
        const newIds = matches.map((item) => item.product_id);
        return Array.from(new Set([...prev, ...newIds])).slice(-10);
      });
      setSearchCount((prev) => prev + 1);

      const aiRes = await axios.post('http://127.0.0.1:5000/analyze', formData);
      setAiSuggestions(aiRes.data);
    } catch {
      alert('Error searching or analyzing image');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (history.length === 0 || searchCount < 3) {
      setRecommendations([]);
      return;
    }

    axios
      .post('http://127.0.0.1:5000/recommendations', { history })
      .then((res) => setRecommendations(res.data.results))
      .catch((err) => console.error('Recommendation error:', err));
  }, [history, searchCount]);

  const combinedItems = [...results, ...recommendations];

  const handleViewSimilar = (product_id) => {
    const item = combinedItems.find(i => i.product_id === product_id);
    if (!item || !item.url) {
      alert('Image URL not found');
      return;
    }
    fetch(item.url)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `${product_id}.jpg`, { type: 'image/jpeg' });
        setFile(file);
        setFileURL(URL.createObjectURL(file));
        setViewingImage(null);
        setTimeout(() => handleSubmit(), 0);
      });
  };

  const TrendIcon = ({ score }) => {
    if (score === undefined || score === null) return null;
    const isTrending = score > 0.55;
    return (
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          fontSize: '1.2rem',
          color: isTrending ? 'green' : 'red'
        }}
        title={`Trend Score: ${score}`}
      >
        {isTrending ? '📈' : '📉'}
      </div>
    );
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit">Search</button>
      </form>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      {fileURL && (
        <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
          <h3>Uploaded Image:</h3>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={fileURL}
              alt="Uploaded"
              style={{ maxWidth: '300px', maxHeight: '300px', objectFit: 'contain' }}
            />
            <TrendIcon score={uploadedTrendScore} />
          </div>
        </div>
      )}

        {aiSuggestions && (
          <div style={{ marginTop: '3rem', flexGrow: 1, marginLeft: '2rem' }}>
            <h3>Description:</h3>
            <p>{aiSuggestions.description}</p>
            {aiSuggestions.suggestions?.length > 0 && (
              <>
                <h4>✨ Suggested Add-ons:</h4>
                <ul>
                  {aiSuggestions.suggestions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {loading && <p>Loading...</p>}

      {viewingImage && (
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h3>Preview</h3>
          <img
            src={viewingImage}
            alt="Preview"
            style={{ maxWidth: '400px', maxHeight: '400px', objectFit: 'contain' }}
          />
          <br />
          <button
            onClick={() => {
              const match = combinedItems.find(i => i.url === viewingImage);
              if (match) handleViewSimilar(match.product_id);
              else alert('Product not found for this image');
            }}
          >
            Upload Image
          </button>
          <button style={{ marginLeft: '1rem' }} onClick={() => setViewingImage(null)}>
            Close
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h3 style={{ textAlign: 'left' }}>Similar Products:</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {results.map((item) => (
              <div key={item.product_id} style={{ position: 'relative', width: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={item.url}
                  alt={item.product_id}
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                />
                <TrendIcon score={item.trend_score} />
                <p style={{ fontSize: '0.8rem' }}>{(item.score * 100).toFixed(2)}% match</p>
                <button onClick={() => setViewingImage(item.url)}>View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h3>Recommended for You:</h3>
        {searchCount < 3 ? (
          <p>
            Search {3 - searchCount} more time{3 - searchCount > 1 ? 's' : ''} to get recommendations.
          </p>
        ) : recommendations.length === 0 ? (
          <p>Loading recommendations...</p>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {recommendations.map((item) => (
              <div key={item.product_id} style={{ position: 'relative', width: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src={item.url}
                  alt={item.product_id}
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                />
                <TrendIcon score={item.trend_score} />
                <button style={{ marginTop: '1rem' }} onClick={() => setViewingImage(item.url)}>
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageSearch;
