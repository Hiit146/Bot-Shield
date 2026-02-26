import React, { useState } from 'react';
import './App.css';

function App() {
  const [mode, setMode] = useState('single'); // 'single' or 'batch'

  // Single mode state
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Batch mode state
  const [batchInput, setBatchInput] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [batchError, setBatchError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    const usernames = batchInput
      .split(/[,\n]+/)
      .map((u) => u.trim().replace(/^@/, ''))
      .filter(Boolean);

    if (usernames.length === 0) return;

    setBatchLoading(true);
    setBatchResults([]);
    setBatchError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/predict/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setBatchResults(data.results);
    } catch (err) {
      setBatchError(err.message || 'Unexpected error');
    } finally {
      setBatchLoading(false);
    }
  };

  const botCount = batchResults.filter((r) => r.prediction === 'BOT').length;
  const humanCount = batchResults.filter((r) => r.prediction === 'HUMAN').length;
  const errorCount = batchResults.filter((r) => r.error).length;

  return (
    <div className="App">
      <div className="app-container">
        <h1 className="app-title">🤖 Twitter Bot Detector</h1>
        <p className="app-subtitle">Check if Twitter accounts are bots or humans</p>

        {/* Mode Tabs */}
        <div className="tabs">
          <button
            className={`tab ${mode === 'single' ? 'tab-active' : ''}`}
            onClick={() => setMode('single')}
          >
            🔍 Single Check
          </button>
          <button
            className={`tab ${mode === 'batch' ? 'tab-active' : ''}`}
            onClick={() => setMode('batch')}
          >
            📊 Batch Analysis
          </button>
        </div>

        {/* Single Mode */}
        {mode === 'single' && (
          <div className="panel">
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Enter Twitter username (without @)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
              />
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? '🔍 Analyzing...' : '🔍 Check Account'}
              </button>
            </form>

            {error && (
              <div className="error-box">
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && (
              <div className="result-card">
                <h2 className="result-username">@{result.username}</h2>
                <div className={`result-badge ${result.prediction === 'BOT' ? 'badge-bot' : 'badge-human'}`}>
                  {result.prediction === 'BOT' ? '🤖 BOT' : '👤 HUMAN'}
                </div>
                <p className="result-confidence">
                  <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
                </p>
                <div className="prob-bar-container">
                  <div className="prob-label">
                    <span>👤 Human</span>
                    <span>{(result.human_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="prob-bar">
                    <div
                      className="prob-fill prob-human"
                      style={{ width: `${result.human_probability * 100}%` }}
                    ></div>
                  </div>
                  <div className="prob-label">
                    <span>🤖 Bot</span>
                    <span>{(result.bot_probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="prob-bar">
                    <div
                      className="prob-fill prob-bot"
                      style={{ width: `${result.bot_probability * 100}%` }}
                    ></div>
                  </div>
                </div>

                {result.top_features && result.top_features.length > 0 && (
                  <div className="feature-importance">
                    <h3>Why this prediction?</h3>
                    <p className="feature-explanation">
                      Top features contributing to the <strong>{result.prediction}</strong> classification:
                    </p>
                    <div className="feature-bars">
                      {result.top_features.map((f, idx) => {
                        const maxImp = Math.max(...result.top_features.map(x => Math.abs(x.importance)));
                        const width = maxImp > 0 ? `${(Math.abs(f.importance) / maxImp) * 100}%` : '0%';
                        
                        // Determine color based on prediction and importance direction
                        let isBotContribution = false;
                        if (result.prediction === 'BOT') {
                          isBotContribution = f.importance > 0;
                        } else {
                          isBotContribution = f.importance < 0;
                        }

                        return (
                          <div key={idx} className="feature-bar-row">
                            <div className="feature-name" title={f.feature}>{f.feature}</div>
                            <div className="feature-bar-container">
                              <div 
                                className={`feature-bar-fill ${isBotContribution ? 'feature-positive' : 'feature-negative'}`}
                                style={{ width }}
                              ></div>
                            </div>
                            <div className="feature-value">
                              {f.importance > 0 ? '+' : ''}{f.importance.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Batch Mode */}
        {mode === 'batch' && (
          <div className="panel">
            <form onSubmit={handleBatchSubmit}>
              <textarea
                placeholder={"Enter usernames separated by commas or new lines:\nelonmusk, BillGates\nBarackObama"}
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                className="textarea-field"
                rows={4}
              />

              <div className="upload-divider">
                <span className="divider-line"></span>
                <span className="divider-text">OR</span>
                <span className="divider-line"></span>
              </div>

              <label className="csv-upload-label">
                <input
                  type="file"
                  accept=".csv"
                  className="csv-file-input"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setBatchLoading(true);
                    setBatchResults([]);
                    setBatchError(null);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const response = await fetch('http://127.0.0.1:8000/predict/csv', {
                        method: 'POST',
                        body: formData,
                      });
                      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
                      const data = await response.json();
                      setBatchResults(data.results);
                    } catch (err) {
                      setBatchError(err.message || 'Unexpected error');
                    } finally {
                      setBatchLoading(false);
                      e.target.value = '';
                    }
                  }}
                />
                📁 Upload CSV File
              </label>
              <p className="csv-hint">CSV should contain usernames (one per row or comma-separated)</p>

              <button type="submit" disabled={batchLoading} className="btn btn-primary">
                {batchLoading ? '📊 Analyzing...' : '📊 Analyze All'}
              </button>
            </form>

            {batchError && (
              <div className="error-box">
                <strong>Error:</strong> {batchError}
              </div>
            )}

            {batchResults.length > 0 && (
              <>
                {/* Summary Cards */}
                <div className="summary-row">
                  <div className="summary-card summary-total">
                    <div className="summary-number">{batchResults.length}</div>
                    <div className="summary-label">Total Checked</div>
                  </div>
                  <div className="summary-card summary-human">
                    <div className="summary-number">{humanCount}</div>
                    <div className="summary-label">👤 Humans</div>
                  </div>
                  <div className="summary-card summary-bot">
                    <div className="summary-number">{botCount}</div>
                    <div className="summary-label">🤖 Bots</div>
                  </div>
                  {errorCount > 0 && (
                    <div className="summary-card summary-error">
                      <div className="summary-number">{errorCount}</div>
                      <div className="summary-label">⚠ Errors</div>
                    </div>
                  )}
                </div>

                {/* Results Table */}
                <div className="table-wrapper">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Username</th>
                        <th>Prediction</th>
                        <th>Confidence</th>
                        <th>Bot %</th>
                        <th>Human %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResults.map((r, i) => (
                        <tr key={i} className={r.error ? 'row-error' : r.prediction === 'BOT' ? 'row-bot' : 'row-human'}>
                          <td>{i + 1}</td>
                          <td className="cell-username">@{r.username}</td>
                          <td>
                            {r.error ? (
                              <span className="badge-error">⚠ Error</span>
                            ) : (
                              <span className={`badge-inline ${r.prediction === 'BOT' ? 'badge-inline-bot' : 'badge-inline-human'}`}>
                                {r.prediction === 'BOT' ? '🤖 BOT' : '👤 HUMAN'}
                              </span>
                            )}
                          </td>
                          <td>{r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : '—'}</td>
                          <td>{r.bot_probability ? `${(r.bot_probability * 100).toFixed(1)}%` : '—'}</td>
                          <td>{r.human_probability ? `${(r.human_probability * 100).toFixed(1)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
