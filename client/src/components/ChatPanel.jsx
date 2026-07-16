import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import api from '../api/axios';

const ChatPanel = ({ reportId }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! I can answer questions about your report and cross-check key findings against WHO-guideline-based guidance.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await api.post(`/reports/${reportId}/chat`, { message: userMsg });
      setMessages(prev => [...prev, { role: 'ai', content: response.data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error analyzing your question. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden w-full transition-colors duration-200">
      <div className="bg-blue-600 dark:bg-blue-800 px-4 py-3 flex items-center gap-2 text-white">
        <Bot size={20} />
        <h3 className="font-semibold text-sm">Chat with Report</h3>
      </div>
      
      <div className="overflow-y-auto max-h-[500px] p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
               <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'}`}>
                 {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
               </div>
               <div className={`px-4 py-2 rounded-2xl text-sm ${
                 msg.role === 'user' 
                   ? 'bg-blue-600 text-white rounded-tr-sm' 
                   : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'
               }`}>
                 <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
               </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
               <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                 <Bot size={16} />
               </div>
               <div className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 flex items-center gap-2 rounded-tl-sm shadow-sm">
                 <Loader2 className="animate-spin text-purple-500" size={16} />
                 <span className="text-sm">Thinking...</span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this specific report..."
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
