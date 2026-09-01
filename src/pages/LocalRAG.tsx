import { useState, useCallback, useEffect } from 'react';
import { inferenceEngine } from '../engine/inference-engine';
import { extractTextFromPDF, chunkText } from '../utils/pdf-parser';
import {
  addVectors,
  addDocument,
  getVectors,
  getDocuments,
  deleteVectors,
  deleteDocument,
  getAllCollections,
  searchVectors,
  type VectorRecord,
  type DocumentRecord,
} from '../utils/vector-store';

export default function LocalRAG() {
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState('');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ text: string; score: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);

  const loadCollections = useCallback(async () => {
    const cols = await getAllCollections();
    setCollections(cols);
    if (cols.length > 0 && !activeCollection) {
      setActiveCollection(cols[0]);
    }
  }, [activeCollection]);

  const loadDocuments = useCallback(async () => {
    if (!activeCollection) return;
    const docs = await getDocuments(activeCollection);
    setDocuments(docs);
  }, [activeCollection]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    const name = newCollectionName.trim();
    setActiveCollection(name);
    setCollections(prev => [...prev, name]);
    setNewCollectionName('');
    setShowNewCollection(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCollection) return;

    setUploading(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else {
        text = await file.text();
      }

      const chunks = chunkText(text);

      await addDocument({
        collection: activeCollection,
        name: file.name,
        content: text,
        chunks,
        createdAt: Date.now(),
      });

      const embeddings = await inferenceEngine.embed(chunks, { modelId: 'embedding' });

      const vectorRecords: VectorRecord[] = chunks.map((chunk, i) => ({
        collection: activeCollection,
        text: chunk,
        embedding: embeddings[i] || [],
        metadata: { source: file.name, chunkIndex: i },
        createdAt: Date.now(),
      }));

      await addVectors(activeCollection, vectorRecords);
      await loadDocuments();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      alert(`Upload failed: ${errorMsg}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || !activeCollection) return;

    setLoading(true);
    setAnswer('');
    setSearchResults([]);

    try {
      const queryEmbeddings = await inferenceEngine.embed([query], { modelId: 'embedding' });
      const vectors = await getVectors(activeCollection);
      const results = searchVectors(vectors, queryEmbeddings[0], 5);
      setSearchResults(results);

      const context = results.map(r => r.text).join('\n\n');
      const prompt = `Based on the following context, answer the question. If the answer is not in the context, say so.\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

      let answerText = '';
      const gen = await inferenceEngine.generate(prompt);
      for await (const token of gen) {
        answerText += token;
        setAnswer(answerText);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Query failed';
      setAnswer(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    await deleteDocument(id);
    await deleteVectors(activeCollection);
    await loadDocuments();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Collection Management */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-white">Knowledge Base</h3>
          <button
            onClick={() => setShowNewCollection(!showNewCollection)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#007AFF]/10 text-[#007AFF] btn-press ease-transition"
          >
            + New Collection
          </button>
        </div>

        {showNewCollection && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className="flex-1 px-3 py-2 text-sm rounded-xl bg-black/5 dark:bg-white/10 text-[#1D1D1F] dark:text-white placeholder-[#86868B]/50 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
            />
            <button
              onClick={handleCreateCollection}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-[#007AFF] text-white btn-press"
            >
              Create
            </button>
          </div>
        )}

        {collections.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {collections.map(col => (
              <button
                key={col}
                onClick={() => { setActiveCollection(col); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg btn-press ease-transition ${
                  activeCollection === col
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-black/5 dark:bg-white/10 text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#86868B] dark:text-[#98989D]">No collections yet. Create one to get started.</p>
        )}
      </div>

      {/* Upload Area */}
      {activeCollection && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-white mb-3">Upload Documents</h3>
          <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 cursor-pointer hover:border-[#007AFF]/50 ease-transition">
            <input
              type="file"
              accept=".pdf,.txt,.md,.text"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="text-center">
                <svg className="animate-spin w-8 h-8 mx-auto mb-2 text-[#007AFF]" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <p className="text-xs text-[#86868B]">Processing & embedding...</p>
              </div>
            ) : (
              <div className="text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-xs text-[#86868B] dark:text-[#98989D]">Upload PDF or text files</p>
              </div>
            )}
          </label>

          {/* Document List */}
          {documents.length > 0 && (
            <div className="mt-3 space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                  <div>
                    <p className="text-xs font-medium text-[#1D1D1F] dark:text-white">{doc.name}</p>
                    <p className="text-[10px] text-[#86868B]">{doc.chunks.length} chunks</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id!)}
                    className="p-1 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10 btn-press"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Query Area */}
      {activeCollection && (
        <div className="card p-4">
          <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-white mb-3">Ask a Question</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask about your documents..."
              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-black/5 dark:bg-white/10 text-[#1D1D1F] dark:text-white placeholder-[#86868B]/50 outline-none"
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
            />
            <button
              onClick={handleQuery}
              disabled={!query.trim() || loading}
              className="px-5 py-2.5 text-sm font-medium rounded-xl bg-[#007AFF] text-white disabled:opacity-40 disabled:cursor-not-allowed btn-press ease-transition"
            >
              {loading ? '...' : 'Ask'}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {answer && (
        <div className="card p-4 animate-fade-in">
          <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-white mb-3">Answer</h3>
          <p className={`text-sm text-[#1D1D1F] dark:text-white leading-relaxed ${loading ? 'streaming-cursor' : ''}`}>
            {answer}
          </p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="card p-4 animate-fade-in">
          <h3 className="text-sm font-medium text-[#1D1D1F] dark:text-white mb-3">
            Retrieved Context ({searchResults.length} chunks)
          </h3>
          <div className="space-y-2">
            {searchResults.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-[#007AFF]">Chunk {i + 1}</span>
                  <span className="text-[10px] text-[#86868B]">
                    Similarity: {(r.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-[#1D1D1F] dark:text-white leading-relaxed line-clamp-3">
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
