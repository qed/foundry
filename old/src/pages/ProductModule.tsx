import React from 'react';
import { Search, Filter, Plus, MoreHorizontal } from 'lucide-react';
import { FeatureTree, TreeNode } from '../components/FeatureTree';
import { ChatInterface } from '../components/ChatInterface';
const mockTreeData: TreeNode[] = [
{
  id: 'epic-1',
  title: 'Conversational AI Engine',
  type: 'epic',
  status: 'in-progress',
  children: [
  {
    id: 'feat-1',
    title: 'Natural Language Processing',
    type: 'feature',
    status: 'in-progress',
    children: [
    {
      id: 'sub-1',
      title: 'Intent Classification',
      type: 'sub-feature',
      status: 'in-progress',
      children: [
      {
        id: 'task-1',
        title: 'Train intent model on leasing queries',
        type: 'task',
        status: 'in-progress',
        hasWorkOrder: true
      },
      {
        id: 'task-2',
        title: 'Define fallback intents',
        type: 'task',
        status: 'done',
        hasWorkOrder: true
      }]

    },
    {
      id: 'sub-2',
      title: 'Entity Extraction',
      type: 'sub-feature',
      status: 'planned',
      children: [
      {
        id: 'task-3',
        title: 'Extract dates and times',
        type: 'task',
        status: 'planned',
        hasWorkOrder: true
      },
      {
        id: 'task-4',
        title: 'Extract location preferences',
        type: 'task',
        status: 'planned',
        hasWorkOrder: true
      }]

    }]

  },
  {
    id: 'feat-2',
    title: 'Response Generation',
    type: 'feature',
    status: 'planned',
    children: []
  }]

},
{
  id: 'epic-2',
  title: 'FAQ Knowledge Base',
  type: 'epic',
  status: 'in-progress',
  children: [
  {
    id: 'feat-3',
    title: 'Vector Database Setup',
    type: 'feature',
    status: 'done',
    children: [
    {
      id: 'sub-3',
      title: 'Pinecone Integration',
      type: 'sub-feature',
      status: 'done',
      children: [
      {
        id: 'task-5',
        title: 'Setup index',
        type: 'task',
        status: 'done',
        hasWorkOrder: true
      },
      {
        id: 'task-6',
        title: 'Connect API keys',
        type: 'task',
        status: 'done',
        hasWorkOrder: true
      }]

    }]

  }]

},
{
  id: 'epic-3',
  title: 'Website Scraping Pipeline',
  type: 'epic',
  status: 'planned',
  children: []
}];

export function ProductModule() {
  return (
    <div className="min-h-0 flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-100px)]">
      {/* Left Panel: Feature Tree */}
      <div className="w-full md:w-[55%] flex flex-col h-[50vh] md:h-full bg-background-secondary rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-background-secondary">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Feature Tree
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              6 Epics · 24 Features · 47 Tasks
            </p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-background-tertiary rounded text-text-secondary hover:text-text-primary transition-colors">
              <Filter size={18} />
            </button>
            <button className="p-2 bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan rounded border border-accent-cyan/20 transition-colors">
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border bg-background-primary/30">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              size={14} />

            <input
              type="text"
              placeholder="Search requirements..."
              className="w-full bg-background-tertiary border border-border rounded pl-9 pr-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-cyan/50 placeholder:text-text-tertiary" />

          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <FeatureTree data={mockTreeData} />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-background-secondary text-xs text-text-tertiary flex justify-between flex-wrap gap-2">
          <span className="hidden sm:inline">Last updated 5m ago by Alex</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-text-tertiary"></span>{' '}
              Planned
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-cyan"></span> In
              Progress
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-success"></span>{' '}
              Done
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel: AI Chat */}
      <div className="w-full md:w-[45%] h-[50vh] md:h-full">
        <ChatInterface />
      </div>
    </div>);

}