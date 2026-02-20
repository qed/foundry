import React, { Component } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, CheckCircle2, Circle, Clock } from 'lucide-react';
interface Task {
  id: string;
  title: string;
  epic: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  acceptanceCriteria: number;
  status: 'todo' | 'in-progress' | 'done';
}
const tasks: Task[] = [
{
  id: '1',
  title: 'Implement Intent Classification Model',
  epic: 'Conversational AI',
  assignee: 'SC',
  priority: 'high',
  acceptanceCriteria: 4,
  status: 'in-progress'
},
{
  id: '2',
  title: 'Setup Vector Database',
  epic: 'FAQ System',
  assignee: 'JP',
  priority: 'high',
  acceptanceCriteria: 3,
  status: 'in-progress'
},
{
  id: '3',
  title: 'Design Chat UI Components',
  epic: 'Frontend',
  assignee: 'AR',
  priority: 'medium',
  acceptanceCriteria: 5,
  status: 'done'
},
{
  id: '4',
  title: 'Integrate OpenAI API',
  epic: 'Conversational AI',
  assignee: 'SC',
  priority: 'high',
  acceptanceCriteria: 4,
  status: 'todo'
},
{
  id: '5',
  title: 'Create Scraper Service',
  epic: 'Scraping',
  assignee: 'JP',
  priority: 'medium',
  acceptanceCriteria: 6,
  status: 'todo'
},
{
  id: '6',
  title: 'Define API Contracts',
  epic: 'Backend',
  assignee: 'AR',
  priority: 'high',
  acceptanceCriteria: 3,
  status: 'done'
},
{
  id: '7',
  title: 'User Authentication Flow',
  epic: 'Admin',
  assignee: 'SC',
  priority: 'low',
  acceptanceCriteria: 2,
  status: 'todo'
},
{
  id: '8',
  title: 'Deploy Staging Environment',
  epic: 'DevOps',
  assignee: 'JP',
  priority: 'medium',
  acceptanceCriteria: 8,
  status: 'done'
}];

const Column = ({
  title,
  status,
  items




}: {title: string;status: Task['status'];items: Task[];}) => {
  const getStatusColor = (s: Task['status']) => {
    switch (s) {
      case 'todo':
        return 'border-t-text-tertiary';
      case 'in-progress':
        return 'border-t-accent-cyan';
      case 'done':
        return 'border-t-accent-success';
      default:
        return 'border-t-border';
    }
  };
  const getPriorityColor = (p: Task['priority']) => {
    switch (p) {
      case 'high':
        return 'bg-accent-error';
      case 'medium':
        return 'bg-accent-warning';
      case 'low':
        return 'bg-accent-success';
      default:
        return 'bg-text-tertiary';
    }
  };
  return (
    <div className="flex-1 min-w-[260px] md:min-w-[300px] flex flex-col h-full">
      <div
        className={`flex items-center justify-between mb-4 pb-2 border-t-2 ${getStatusColor(status)} pt-2`}>

        <h3 className="font-semibold text-text-secondary uppercase tracking-wider text-sm">
          {title}
        </h3>
        <span className="bg-background-tertiary text-text-tertiary px-2 py-0.5 rounded text-xs font-mono">
          {items.length}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {items.map((task) =>
        <motion.div
          key={task.id}
          whileHover={{
            scale: 1.02,
            y: -2
          }}
          className={`bg-background-secondary p-3 md:p-4 rounded border border-border cursor-pointer hover:border-accent-cyan/30 hover:shadow-glow-sm transition-all ${status === 'done' ? 'opacity-60 hover:opacity-100' : ''}`}>

            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-wider text-accent-cyan font-medium px-1.5 py-0.5 bg-accent-cyan/10 rounded border border-accent-cyan/20">
                {task.epic}
              </span>
              <button className="text-text-tertiary hover:text-text-primary">
                <MoreHorizontal size={14} />
              </button>
            </div>

            <h4 className="text-sm font-medium text-text-primary mb-3 leading-snug">
              {task.title}
            </h4>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-background-tertiary border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary">
                  {task.assignee}
                </div>
                <div
                className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                title={`Priority: ${task.priority}`} />

              </div>

              <div className="flex items-center gap-1 text-xs text-text-tertiary">
                <CheckCircle2 size={12} />
                <span>{task.acceptanceCriteria} AC</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>);

};
export function KanbanBoard() {
  return (
    <div className="flex gap-4 md:gap-6 h-full overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
      <Column
        title="To Do"
        status="todo"
        items={tasks.filter((t) => t.status === 'todo')} />

      <Column
        title="In Progress"
        status="in-progress"
        items={tasks.filter((t) => t.status === 'in-progress')} />

      <Column
        title="Done"
        status="done"
        items={tasks.filter((t) => t.status === 'done')} />

    </div>);

}