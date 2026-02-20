import React from 'react';
import { Settings, FileCode, ArrowRight } from 'lucide-react';
export function SystemsModule() {
  return (
    <div className="max-w-4xl mx-auto pt-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-accent-warning/10 rounded-lg border border-accent-warning/20">
          <Settings className="text-accent-warning w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Systems Architecture
          </h1>
          <p className="text-text-secondary">
            Technical blueprints and implementation details
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {[1, 2, 3].map((i) =>
        <div
          key={i}
          className="bg-background-secondary border border-border rounded-lg p-6 hover:border-accent-warning/50 transition-colors cursor-pointer group">

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <FileCode className="text-text-tertiary" size={18} />
                <h3 className="font-semibold text-text-primary">
                  Conversational Engine Architecture
                </h3>
              </div>
              <span className="px-2 py-1 bg-background-tertiary rounded text-xs text-text-secondary border border-border">
                Draft
              </span>
            </div>
            <p className="text-text-secondary text-sm mb-4 leading-relaxed">
              Detailed specification for the intent classification pipeline
              using OpenAI embeddings and Pinecone vector storage. Includes
              fallback strategies and context window management.
            </p>
            <div className="flex items-center text-accent-warning text-sm font-medium group-hover:gap-2 transition-all">
              View Blueprint <ArrowRight size={16} className="ml-1" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 text-center p-8 border border-dashed border-border rounded-lg bg-background-secondary/30">
        <p className="text-text-tertiary">
          Codebase integration and automated architecture diagrams coming in V2
        </p>
      </div>
    </div>);

}