const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'types', 'database.ts');
let content = fs.readFileSync(filePath, 'utf8');
// Normalize to LF for matching, will restore CRLF at end
const hadCRLF = content.includes('\r\n');
if (hadCRLF) content = content.replace(/\r\n/g, '\n');

// Verify we're working with the expected file
if (!content.includes('agent_conversations') || content.includes('feature_nodes')) {
  console.log('File is not in expected state. Aborting.');
  process.exit(1);
}

// 1. Insert new tables right before the closing of Tables (before Views)
// Find the exact pattern: end of agent_conversations followed by Tables closing brace and Views
const marker = `        ];
      };
    };
    Views: Record<string, never>;`;

const replacement = `        ];
      };
      feature_nodes: {
        Row: {
          id: string;
          project_id: string;
          parent_id: string | null;
          title: string;
          description: string | null;
          level: "epic" | "feature" | "sub_feature" | "task";
          status: "not_started" | "in_progress" | "complete" | "blocked";
          position: number;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_id?: string | null;
          title: string;
          description?: string | null;
          level: "epic" | "feature" | "sub_feature" | "task";
          status?: "not_started" | "in_progress" | "complete" | "blocked";
          position?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          parent_id?: string | null;
          title?: string;
          description?: string | null;
          level?: "epic" | "feature" | "sub_feature" | "task";
          status?: "not_started" | "in_progress" | "complete" | "blocked";
          position?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feature_nodes_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feature_nodes_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "feature_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feature_nodes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      requirements_documents: {
        Row: {
          id: string;
          project_id: string;
          feature_node_id: string | null;
          doc_type: "product_overview" | "feature_requirement" | "technical_requirement";
          title: string;
          content: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          feature_node_id?: string | null;
          doc_type: "product_overview" | "feature_requirement" | "technical_requirement";
          title: string;
          content?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          feature_node_id?: string | null;
          doc_type?: "product_overview" | "feature_requirement" | "technical_requirement";
          title?: string;
          content?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requirements_documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requirements_documents_feature_node_id_fkey";
            columns: ["feature_node_id"];
            isOneToOne: false;
            referencedRelation: "feature_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requirements_documents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      requirement_versions: {
        Row: {
          id: string;
          requirement_doc_id: string;
          version_number: number;
          content: string;
          created_by: string;
          created_at: string;
          change_summary: string | null;
        };
        Insert: {
          id?: string;
          requirement_doc_id: string;
          version_number: number;
          content: string;
          created_by: string;
          created_at?: string;
          change_summary?: string | null;
        };
        Update: {
          id?: string;
          requirement_doc_id?: string;
          version_number?: number;
          content?: string;
          created_by?: string;
          created_at?: string;
          change_summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "requirement_versions_requirement_doc_id_fkey";
            columns: ["requirement_doc_id"];
            isOneToOne: false;
            referencedRelation: "requirements_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requirement_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;`;

// Use lastIndexOf to find the last occurrence (the one right before Views)
const markerIdx = content.lastIndexOf(marker);
if (markerIdx === -1) {
  console.log('ERROR: Could not find table insertion marker');
  process.exit(1);
}
content = content.substring(0, markerIdx) + replacement + content.substring(markerIdx + marker.length);

// 2. Add helper function
content = content.replace(
  `      idea_project_member: {\n        Args: {\n          check_idea_id: string;\n        };\n        Returns: boolean;\n      };\n    };`,
  `      idea_project_member: {\n        Args: {\n          check_idea_id: string;\n        };\n        Returns: boolean;\n      };\n      requirement_doc_project_member: {\n        Args: {\n          check_doc_id: string;\n        };\n        Returns: boolean;\n      };\n    };`
);

// 3. Add type aliases
content = content.replace(
  'export type AgentConversation = Database["public"]["Tables"]["agent_conversations"]["Row"];',
  `export type AgentConversation = Database["public"]["Tables"]["agent_conversations"]["Row"];\nexport type FeatureNode = Database["public"]["Tables"]["feature_nodes"]["Row"];\nexport type RequirementsDocument = Database["public"]["Tables"]["requirements_documents"]["Row"];\nexport type RequirementVersion = Database["public"]["Tables"]["requirement_versions"]["Row"];`
);

// 4. Add status/level types
content = content.replace(
  'export type IdeaStatus = Idea["status"];',
  `export type IdeaStatus = Idea["status"];\n\n// Status and level types for feature nodes\nexport type FeatureLevel = FeatureNode["level"];\nexport type FeatureStatus = FeatureNode["status"];\nexport type RequirementDocType = RequirementsDocument["doc_type"];`
);

// Restore CRLF if original had it
if (hadCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content);
console.log('SUCCESS - file updated, lines:', content.split(/\r?\n/).length);
console.log('Contains feature_nodes:', content.includes('feature_nodes'));
console.log('Contains FeatureNode:', content.includes('export type FeatureNode'));
