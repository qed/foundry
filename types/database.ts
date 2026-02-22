export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: "admin" | "member";
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: "admin" | "member";
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: "admin" | "member";
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "leader" | "developer";
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: "leader" | "developer";
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "leader" | "developer";
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ideas: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          body: string | null;
          status: "raw" | "developing" | "mature" | "promoted" | "archived";
          created_by: string;
          created_at: string;
          updated_at: string;
          promoted_to_seed_id: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          body?: string | null;
          status?: "raw" | "developing" | "mature" | "promoted" | "archived";
          created_by: string;
          created_at?: string;
          updated_at?: string;
          promoted_to_seed_id?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          body?: string | null;
          status?: "raw" | "developing" | "mature" | "promoted" | "archived";
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          promoted_to_seed_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ideas_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ideas_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_tags: {
        Row: {
          id: string;
          idea_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_tags_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_connections: {
        Row: {
          id: string;
          source_idea_id: string;
          target_idea_id: string;
          connection_type: "related" | "duplicates" | "extends";
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_idea_id: string;
          target_idea_id: string;
          connection_type?: "related" | "duplicates" | "extends";
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_idea_id?: string;
          target_idea_id?: string;
          connection_type?: "related" | "duplicates" | "extends";
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "idea_connections_source_idea_id_fkey";
            columns: ["source_idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_connections_target_idea_id_fkey";
            columns: ["target_idea_id"];
            isOneToOne: false;
            referencedRelation: "ideas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "idea_connections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_conversations: {
        Row: {
          id: string;
          project_id: string;
          module: string;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          module?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          module?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_conversations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
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
    Views: Record<string, never>;
    Functions: {
      get_user_organizations: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
          role: string;
        }[];
      };
      get_org_projects: {
        Args: {
          target_org_id: string;
        };
        Returns: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        }[];
      };
      idea_project_member: {
        Args: {
          check_idea_id: string;
        };
        Returns: boolean;
      };
      requirement_doc_project_member: {
        Args: {
          check_doc_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
};

// Convenience type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrgMember = Database["public"]["Tables"]["org_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type Idea = Database["public"]["Tables"]["ideas"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type IdeaTag = Database["public"]["Tables"]["idea_tags"]["Row"];
export type IdeaConnection = Database["public"]["Tables"]["idea_connections"]["Row"];
export type AgentConversation = Database["public"]["Tables"]["agent_conversations"]["Row"];

export type FeatureNode = Database["public"]["Tables"]["feature_nodes"]["Row"];
export type RequirementsDocument = Database["public"]["Tables"]["requirements_documents"]["Row"];
export type RequirementVersion = Database["public"]["Tables"]["requirement_versions"]["Row"];

// Status type aliases
export type IdeaStatus = Idea["status"];
export type FeatureLevel = FeatureNode["level"];
export type FeatureStatus = FeatureNode["status"];
export type DocType = RequirementsDocument["doc_type"];
