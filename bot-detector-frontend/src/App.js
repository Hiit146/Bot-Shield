import React, { useState, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CTASection } from './components/ui/hero-dithering-card';
import './App.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

function App() {
  const [mode, setMode] = useState('single'); // 'single' or 'batch'
  const reportRef = useRef(null);

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

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      const reportElement = reportRef.current;
      
      // Temporarily show the header for the PDF
      const header = reportElement.querySelector('.report-header');
      if (header) header.style.display = 'block';
      
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        backgroundColor: '#192734',
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight
      });
      
      // Hide the header again
      if (header) header.style.display = 'none';

      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Bot_Report_${result.username}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF", err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  return (
    <div className="App">
      <CTASection>
        {/* Mode Tabs */}
        <div className="flex p-1 space-x-1 bg-muted/50 rounded-xl mb-6">
          <button
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'single' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}
            onClick={() => setMode('single')}
          >
            🔍 Single Check
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'batch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'}`}
            onClick={() => setMode('batch')}
          >
            📊 Batch Analysis
          </button>
        </div>

        {/* Single Mode */}
        {mode === 'single' && (
          <div className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Enter Twitter username (without @)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              />
              <button type="submit" disabled={loading} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 w-full shadow-sm">
                {loading ? '🔍 Analyzing...' : '🔍 Check Account'}
              </button>
            </form>
          </div>
        )}

        {/* Batch Mode */}
        {mode === 'batch' && (
          <div className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleBatchSubmit} className="flex flex-col gap-4">
              <textarea
                placeholder={"Enter usernames separated by commas or new lines:\nelonmusk, BillGates\nBarackObama"}
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y"
                rows={4}
              />

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">OR</span>
                </div>
              </div>

              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <p className="text-sm text-muted-foreground font-medium">📁 Upload CSV File</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
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
              </label>
              <p className="text-xs text-muted-foreground text-center -mt-2">CSV should contain usernames (one per row or comma-separated)</p>

              <button type="submit" disabled={batchLoading} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 w-full shadow-sm mt-2">
                {batchLoading ? '📊 Analyzing...' : '📊 Analyze All'}
              </button>
            </form>
          </div>
        )}

        {/* Single Mode Results */}
        {mode === 'single' && (
          <div className="mt-8 w-full">
            {error && (
              <div className="p-4 mb-4 text-sm text-destructive-foreground bg-destructive/90 rounded-xl">
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && (
              <div className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-sm text-left">
                <div className="flex justify-end mb-4">
                  <button onClick={handleExportPDF} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                    📄 Export PDF Report
                  </button>
                </div>
                <div ref={reportRef} className="space-y-6">
                  <div className="report-header hidden">
                    <h2 className="text-2xl font-bold">Bot Detection Report</h2>
                    <p className="text-muted-foreground">Generated on: {new Date().toLocaleString()}</p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center space-y-4">
                    <h2 className="text-3xl font-bold text-foreground">@{result.username}</h2>
                    <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${result.prediction === 'BOT' ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>
                      {result.prediction === 'BOT' ? '🤖 BOT' : '👤 HUMAN'}
                    </div>
                    <p className="text-lg text-muted-foreground">
                      <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="space-y-4 max-w-md mx-auto">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">👤 Human</span>
                        <span className="text-foreground">{(result.human_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${result.human_probability * 100}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">🤖 Bot</span>
                        <span className="text-foreground">{(result.bot_probability * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-destructive transition-all duration-500" style={{ width: `${result.bot_probability * 100}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {result.profile_data && (
                    <div className="mt-8 p-6 bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground tracking-tight">Profile Details</h3>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="flex flex-col items-center justify-center p-5 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Followers</div>
                          <div className="text-2xl font-bold text-foreground">{result.profile_data.followers?.toLocaleString() || 0}</div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-5 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Following</div>
                          <div className="text-2xl font-bold text-foreground">{result.profile_data.following?.toLocaleString() || 0}</div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-5 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Posts</div>
                          <div className="text-2xl font-bold text-foreground">{result.profile_data.posts_count?.toLocaleString() || 0}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="flex items-center gap-3 p-4 bg-background/30 rounded-xl border border-border/30">
                          <div className={`p-2 rounded-full ${result.profile_data.is_verified ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                            {result.profile_data.is_verified ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Verification Status</div>
                            <div className="font-medium text-foreground">{result.profile_data.is_verified ? 'Verified Account' : 'Not Verified'}</div>
                          </div>
                        </div>
                        
                        {result.profile_data.date_joined && (
                          <div className="flex items-center gap-3 p-4 bg-background/30 rounded-xl border border-border/30">
                            <div className="p-2 bg-primary/10 text-primary rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Joined Twitter</div>
                              <div className="font-medium text-foreground">{new Date(result.profile_data.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            </div>
                          </div>
                        )}
                        
                        {result.profile_data.biography && (
                          <div className="col-span-1 md:col-span-2 p-4 bg-background/30 rounded-xl border border-border/30">
                            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              Biography
                            </div>
                            <p className="text-sm text-foreground/90 leading-relaxed italic">"{result.profile_data.biography}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {result.top_features && result.top_features.length > 0 && (
                    <div className="mt-8 p-6 bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground tracking-tight">Why this prediction?</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-8 ml-11">
                        Top features contributing to the <strong className={result.prediction === 'BOT' ? 'text-destructive' : 'text-green-500'}>{result.prediction}</strong> classification:
                      </p>
                      
                      <div className="space-y-5">
                        {result.top_features.map((f, idx) => {
                          const maxImp = Math.max(...result.top_features.map(x => Math.abs(x.importance)));
                          const width = maxImp > 0 ? `${(Math.abs(f.importance) / maxImp) * 100}%` : '0%';
                          
                          let isBotContribution = false;
                          if (result.prediction === 'BOT') {
                            isBotContribution = f.importance > 0;
                          } else {
                            isBotContribution = f.importance < 0;
                          }

                          return (
                            <div key={idx} className="group">
                              <div className="flex justify-between items-end mb-2">
                                <div className="text-sm font-medium text-foreground/90 truncate pr-4" title={f.feature}>
                                  {f.feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </div>
                                <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${isBotContribution ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {f.importance > 0 ? '+' : ''}{f.importance.toFixed(2)}
                                </div>
                              </div>
                              <div className="h-2.5 w-full bg-background rounded-full overflow-hidden border border-border/50">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isBotContribution ? 'bg-gradient-to-r from-primary/80 to-primary' : 'bg-muted-foreground/40'}`}
                                  style={{ width }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {result.radar_data && (
                    <div className="mt-8 p-6 bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm flex flex-col items-center">
                      <div className="flex items-center gap-3 mb-2 w-full">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground tracking-tight">Bot Score Breakdown</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-8 w-full ml-11">
                        Comparing this profile's normalized features against average bot and human profiles.
                      </p>
                      <div className="w-full max-w-md aspect-square bg-background/30 rounded-xl p-4 border border-border/30">
                        <Radar
                          data={{
                            labels: result.radar_data.labels,
                            datasets: [
                              {
                                label: 'This Profile',
                                data: result.radar_data.user,
                                backgroundColor: 'rgba(234, 88, 12, 0.2)',
                                borderColor: 'rgba(234, 88, 12, 1)',
                                borderWidth: 2,
                                pointBackgroundColor: 'rgba(234, 88, 12, 1)',
                              },
                              {
                                label: 'Avg Bot',
                                data: result.radar_data.avg_bot,
                                backgroundColor: 'rgba(249, 24, 128, 0.1)',
                                borderColor: 'rgba(249, 24, 128, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                pointBackgroundColor: 'rgba(249, 24, 128, 0.5)',
                              },
                              {
                                label: 'Avg Human',
                                data: result.radar_data.avg_human,
                                backgroundColor: 'rgba(0, 186, 124, 0.1)',
                                borderColor: 'rgba(0, 186, 124, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                pointBackgroundColor: 'rgba(0, 186, 124, 0.5)',
                              },
                            ],
                          }}
                          options={{
                            scales: {
                              r: {
                                angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                pointLabels: { color: '#8899a6', font: { size: 11 } },
                                ticks: { display: false },
                              },
                            },
                            plugins: {
                              legend: {
                                labels: { color: '#e8eaed' },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Batch Mode Results */}
        {mode === 'batch' && (
          <div className="mt-8 w-full">
            {batchError && (
              <div className="p-4 mb-4 text-sm text-destructive-foreground bg-destructive/90 rounded-xl">
                <strong>Error:</strong> {batchError}
              </div>
            )}

            {batchResults.length > 0 && (
              <div className="w-full bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-sm text-left">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-muted/30 rounded-xl border border-border text-center">
                    <div className="text-3xl font-bold text-foreground">{batchResults.length}</div>
                    <div className="text-sm text-muted-foreground">Total Checked</div>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20 text-center">
                    <div className="text-3xl font-bold text-green-500">{humanCount}</div>
                    <div className="text-sm text-green-500/80">👤 Humans</div>
                  </div>
                  <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20 text-center">
                    <div className="text-3xl font-bold text-destructive">{botCount}</div>
                    <div className="text-sm text-destructive/80">🤖 Bots</div>
                  </div>
                  {errorCount > 0 && (
                    <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-center">
                      <div className="text-3xl font-bold text-yellow-500">{errorCount}</div>
                      <div className="text-sm text-yellow-500/80">⚠ Errors</div>
                    </div>
                  )}
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                      <tr>
                        <th className="px-6 py-3">#</th>
                        <th className="px-6 py-3">Username</th>
                        <th className="px-6 py-3">Prediction</th>
                        <th className="px-6 py-3">Confidence</th>
                        <th className="px-6 py-3">Bot %</th>
                        <th className="px-6 py-3">Human %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResults.map((r, i) => (
                        <tr key={i} className="border-b border-border last:border-0 bg-background/50 hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 text-muted-foreground">{i + 1}</td>
                          <td className="px-6 py-4 font-medium text-foreground">@{r.username}</td>
                          <td className="px-6 py-4">
                            {r.error ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500">⚠ Error</span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${r.prediction === 'BOT' ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>
                                {r.prediction === 'BOT' ? '🤖 BOT' : '👤 HUMAN'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-foreground">{r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : '—'}</td>
                          <td className="px-6 py-4 text-foreground">{r.bot_probability ? `${(r.bot_probability * 100).toFixed(1)}%` : '—'}</td>
                          <td className="px-6 py-4 text-foreground">{r.human_probability ? `${(r.human_probability * 100).toFixed(1)}%` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CTASection>
    </div>
  );
}

export default App;
