import React from 'react';
import { LineChart, MessageSquare, ThumbsUp, AlertCircle } from 'lucide-react';
export function InsightModule() {
  return (
    <div className="max-w-4xl mx-auto pt-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-accent-success/10 rounded-lg border border-accent-success/20">
          <LineChart className="text-accent-success w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Insight & Feedback
          </h1>
          <p className="text-text-secondary">
            User feedback collection and triage
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="bg-background-secondary border border-border rounded-lg p-6 flex items-start gap-4">
          <div className="mt-1">
            <MessageSquare className="text-accent-cyan" size={20} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-text-primary">
                Chat response latency is high
              </h3>
              <span className="text-xs text-text-tertiary">2h ago</span>
            </div>
            <p className="text-text-secondary text-sm mb-3">
              "When I ask complex questions about lease terms, it takes over 5
              seconds to get a response. Can we optimize this?"
            </p>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-background-tertiary rounded text-xs text-text-secondary border border-border">
                Performance
              </span>
              <span className="px-2 py-1 bg-background-tertiary rounded text-xs text-text-secondary border border-border">
                Conversational AI
              </span>
            </div>
          </div>
        </div>

        <div className="bg-background-secondary border border-border rounded-lg p-6 flex items-start gap-4">
          <div className="mt-1">
            <ThumbsUp className="text-accent-success" size={20} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-text-primary">
                Love the new dark mode
              </h3>
              <span className="text-xs text-text-tertiary">5h ago</span>
            </div>
            <p className="text-text-secondary text-sm">
              "The interface is much easier on the eyes now. Great job on the
              update."
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center p-8 border border-dashed border-border rounded-lg bg-background-secondary/30">
        <p className="text-text-tertiary">
          Advanced analytics and automated feedback triage coming in V2
        </p>
      </div>
    </div>);

}