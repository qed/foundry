import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles } from 'lucide-react';
interface Message {
  id: string;
  sender: 'agent' | 'user';
  content: string;
  timestamp: Date;
}
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
  {
    id: '1',
    sender: 'agent',
    content:
    'I have read through the MacroBot brief. I see six major areas: the conversational AI engine, the FAQ system, website scraping, smart handoffs, conversation logging, and the admin tool. Want me to lay these out as epics and break each one down?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: '2',
    sender: 'user',
    content: 'Yes, start with the conversational AI engine and FAQ system.',
    timestamp: new Date(Date.now() - 1000 * 60 * 4)
  },
  {
    id: '3',
    sender: 'agent',
    content:
    'Here is the breakdown for the Conversational AI Engine epic:\n\n• Intent Classification\n• Entity Extraction\n• Context Management\n• Response Generation',
    timestamp: new Date(Date.now() - 1000 * 60 * 3)
  },
  {
    id: '4',
    sender: 'user',
    content:
    'Looks good. Add a sub-feature for multi-language support under NLP.',
    timestamp: new Date(Date.now() - 1000 * 60 * 2)
  },
  {
    id: '5',
    sender: 'agent',
    content:
    'Done. I have added Multi-Language Support as a sub-feature under Natural Language Processing with three tasks: Language Detection, Translation API Integration, and Response Localization.',
    timestamp: new Date(Date.now() - 1000 * 60 * 1)
  }]
  );
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    // Mock agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content:
        "I've updated the feature tree with your changes. Is there anything else you'd like to refine?",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, agentResponse]);
    }, 1500);
  };
  return (
    <div className="flex flex-col h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-background-secondary/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse absolute -top-0.5 -right-0.5"></div>
            <Bot className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Refinery Agent</h3>
            <p className="text-xs text-text-secondary">AI Product Architect</p>
          </div>
        </div>
        <div className="px-2 py-1 bg-accent-purple/10 rounded text-xs text-accent-purple border border-accent-purple/20 flex items-center gap-1">
          <Sparkles size={12} />
          <span>Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) =>
        <motion.div
          key={msg.id}
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>

            <div
            className={`max-w-[85%] rounded-lg p-3 ${msg.sender === 'user' ? 'bg-accent-purple/10 border border-accent-purple/20 text-text-primary rounded-tr-none' : 'bg-accent-cyan/5 border border-accent-cyan/10 text-text-primary rounded-tl-none'}`}>

              <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] uppercase tracking-wider">
                {msg.sender === 'user' ? <User size={10} /> : <Bot size={10} />}
                <span>{msg.sender === 'user' ? 'You' : 'Refinery'}</span>
                <span>•</span>
                <span>
                  {msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background-secondary">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Refinery to decompose, refine, or validate..."
            className="flex-1 bg-background-primary border border-border rounded-md px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all placeholder:text-text-tertiary" />

          <button
            onClick={handleSend}
            className="bg-accent-gradient p-2.5 rounded-md text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            disabled={!inputValue.trim()}>

            <Send size={18} />
          </button>
        </div>
      </div>
    </div>);

}