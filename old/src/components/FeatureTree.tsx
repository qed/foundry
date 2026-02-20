import React, { useState, Children } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock } from
'lucide-react';
export interface TreeNode {
  id: string;
  title: string;
  type: 'epic' | 'feature' | 'sub-feature' | 'task';
  status: 'planned' | 'in-progress' | 'done';
  hasWorkOrder?: boolean;
  children?: TreeNode[];
}
interface FeatureTreeProps {
  data: TreeNode[];
}
const StatusIcon = ({ status }: {status: TreeNode['status'];}) => {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-accent-success" />;
    case 'in-progress':
      return <Clock className="w-4 h-4 text-accent-cyan" />;
    case 'planned':
    default:
      return <Circle className="w-4 h-4 text-text-tertiary" />;
  }
};
const TreeNodeItem = ({
  node,
  level = 0



}: {node: TreeNode;level?: number;}) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const getLevelStyles = (type: TreeNode['type']) => {
    switch (type) {
      case 'epic':
        return 'text-base md:text-lg font-bold text-text-primary border-l-4 border-accent-cyan pl-2 md:pl-3 py-2 bg-background-secondary/50 mb-2';
      case 'feature':
        return 'text-sm md:text-base font-medium text-text-primary ml-2 md:ml-4 py-1.5';
      case 'sub-feature':
        return 'text-sm text-text-secondary ml-4 md:ml-8 py-1';
      case 'task':
        return 'text-sm text-text-tertiary ml-6 md:ml-12 py-0.5 border-l border-border pl-2 md:pl-3';
      default:
        return '';
    }
  };
  return (
    <div className="w-full">
      <div
        className={`flex items-center group cursor-pointer hover:bg-background-tertiary/30 rounded-r transition-colors ${getLevelStyles(node.type)}`}
        onClick={() => hasChildren && setIsOpen(!isOpen)}>

        <div className="flex items-center gap-2 flex-1">
          {hasChildren &&
          <span className="text-text-tertiary group-hover:text-accent-cyan transition-colors">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          }
          {!hasChildren && node.type !== 'task' &&
          <span className="w-[14px]" />
          }

          <span className="flex-1 truncate">{node.title}</span>

          {node.hasWorkOrder &&
          <span className="px-1.5 py-0.5 text-[10px] bg-accent-purple/20 text-accent-purple rounded border border-accent-purple/30 uppercase tracking-wider">
              WO
            </span>
          }

          <StatusIcon status={node.status} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && hasChildren &&
        <motion.div
          initial={{
            height: 0,
            opacity: 0
          }}
          animate={{
            height: 'auto',
            opacity: 1
          }}
          exit={{
            height: 0,
            opacity: 0
          }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut'
          }}
          className="overflow-hidden">

            <div className="flex flex-col">
              {node.children?.map((child) =>
            <TreeNodeItem key={child.id} node={child} level={level + 1} />
            )}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

};
export function FeatureTree({ data }: FeatureTreeProps) {
  return (
    <div className="w-full space-y-1">
      {data.map((node) =>
      <TreeNodeItem key={node.id} node={node} />
      )}
    </div>);

}