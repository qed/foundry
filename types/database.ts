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
          description: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          avatar_url?: string | null;
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
          is_archived: boolean;
          archived_at: string | null;
          archived_by: string | null;
          extraction_strategy: "feature-slice" | "specialist" | "custom";
          extraction_instructions: string | null;
          extraction_strategy_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          is_archived?: boolean;
          archived_at?: string | null;
          archived_by?: string | null;
          extraction_strategy?: "feature-slice" | "specialist" | "custom";
          extraction_instructions?: string | null;
          extraction_strategy_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          is_archived?: boolean;
          archived_at?: string | null;
          archived_by?: string | null;
          extraction_strategy?: "feature-slice" | "specialist" | "custom";
          extraction_instructions?: string | null;
          extraction_strategy_updated_at?: string | null;
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
          hall_idea_id: string | null;
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
          hall_idea_id?: string | null;
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
          hall_idea_id?: string | null;
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
          category: "auth_security" | "api_integrations" | "performance_scalability" | "data_storage" | null;
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
          category?: "auth_security" | "api_integrations" | "performance_scalability" | "data_storage" | null;
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
          category?: "auth_security" | "api_integrations" | "performance_scalability" | "data_storage" | null;
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
      phases: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          position: number;
          status: "planned" | "active" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          position?: number;
          status?: "planned" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          position?: number;
          status?: "planned" | "active" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "phases_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      work_orders: {
        Row: {
          id: string;
          project_id: string;
          feature_node_id: string | null;
          phase_id: string | null;
          source_blueprint_id: string | null;
          title: string;
          description: string | null;
          description_json: Json | null;
          acceptance_criteria: string | null;
          implementation_plan: string | null;
          implementation_plan_json: Json | null;
          status: "backlog" | "ready" | "in_progress" | "in_review" | "done";
          priority: "critical" | "high" | "medium" | "low";
          assignee_id: string | null;
          position: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          feature_node_id?: string | null;
          phase_id?: string | null;
          source_blueprint_id?: string | null;
          title: string;
          description?: string | null;
          description_json?: Json | null;
          acceptance_criteria?: string | null;
          implementation_plan?: string | null;
          implementation_plan_json?: Json | null;
          status?: "backlog" | "ready" | "in_progress" | "in_review" | "done";
          priority?: "critical" | "high" | "medium" | "low";
          assignee_id?: string | null;
          position?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          feature_node_id?: string | null;
          phase_id?: string | null;
          source_blueprint_id?: string | null;
          title?: string;
          description?: string | null;
          description_json?: Json | null;
          acceptance_criteria?: string | null;
          implementation_plan?: string | null;
          implementation_plan_json?: Json | null;
          status?: "backlog" | "ready" | "in_progress" | "in_review" | "done";
          priority?: "critical" | "high" | "medium" | "low";
          assignee_id?: string | null;
          position?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_orders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_feature_node_id_fkey";
            columns: ["feature_node_id"];
            isOneToOne: false;
            referencedRelation: "feature_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_phase_id_fkey";
            columns: ["phase_id"];
            isOneToOne: false;
            referencedRelation: "phases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      work_order_activity: {
        Row: {
          id: string;
          work_order_id: string;
          user_id: string;
          action: string;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          work_order_id: string;
          user_id: string;
          action: string;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          work_order_id?: string;
          user_id?: string;
          action?: string;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_order_activity_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_order_activity_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      app_keys: {
        Row: {
          id: string;
          project_id: string;
          key_value: string;
          name: string;
          environment: "production" | "staging" | "development" | "custom";
          description: string | null;
          status: "active" | "revoked";
          created_by: string;
          created_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          key_value: string;
          name: string;
          environment?: "production" | "staging" | "development" | "custom";
          description?: string | null;
          status?: "active" | "revoked";
          created_by: string;
          created_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          key_value?: string;
          name?: string;
          environment?: "production" | "staging" | "development" | "custom";
          description?: string | null;
          status?: "active" | "revoked";
          created_by?: string;
          created_at?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "app_keys_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "app_keys_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_connections: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          api_key_hash: string;
          api_key_preview: string;
          agent_type: "code_assistant" | "ci_cd" | "github_action" | "custom";
          status: "active" | "revoked";
          rate_limit: number;
          scopes: string[];
          last_used_at: string | null;
          created_at: string;
          created_by: string;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          api_key_hash: string;
          api_key_preview: string;
          agent_type: "code_assistant" | "ci_cd" | "github_action" | "custom";
          status?: "active" | "revoked";
          rate_limit?: number;
          scopes?: string[];
          last_used_at?: string | null;
          created_at?: string;
          created_by: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          api_key_hash?: string;
          api_key_preview?: string;
          agent_type?: "code_assistant" | "ci_cd" | "github_action" | "custom";
          status?: "active" | "revoked";
          rate_limit?: number;
          scopes?: string[];
          last_used_at?: string | null;
          created_at?: string;
          created_by?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "mcp_connections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mcp_connections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      artifact_folders: {
        Row: {
          id: string;
          project_id: string;
          parent_folder_id: string | null;
          name: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_folder_id?: string | null;
          name: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          parent_folder_id?: string | null;
          name?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artifact_folders_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifact_folders_parent_folder_id_fkey";
            columns: ["parent_folder_id"];
            isOneToOne: false;
            referencedRelation: "artifact_folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifact_folders_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      artifacts: {
        Row: {
          id: string;
          project_id: string;
          folder_id: string | null;
          name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          content_text: string | null;
          processing_status: string;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          folder_id?: string | null;
          name: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          content_text?: string | null;
          processing_status?: string;
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          folder_id?: string | null;
          name?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          content_text?: string | null;
          processing_status?: string;
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artifacts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifacts_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "artifact_folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifacts_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      artifact_entity_links: {
        Row: {
          id: string;
          artifact_id: string;
          entity_type: "idea" | "feature" | "blueprint" | "work_order" | "feedback";
          entity_id: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          artifact_id: string;
          entity_type: "idea" | "feature" | "blueprint" | "work_order" | "feedback";
          entity_id: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          artifact_id?: string;
          entity_type?: "idea" | "feature" | "blueprint" | "work_order" | "feedback";
          entity_id?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artifact_entity_links_artifact_id_fkey";
            columns: ["artifact_id"];
            isOneToOne: false;
            referencedRelation: "artifacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artifact_entity_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      entity_connections: {
        Row: {
          id: string;
          project_id: string;
          source_type: "idea" | "feature" | "blueprint" | "work_order" | "feedback" | "artifact";
          source_id: string;
          target_type: "idea" | "feature" | "blueprint" | "work_order" | "feedback" | "artifact";
          target_id: string;
          connection_type: "references" | "depends_on" | "relates_to" | "implements" | "derived_from" | "conflicts_with" | "complements";
          created_by: string | null;
          is_auto_detected: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          source_type: "idea" | "feature" | "blueprint" | "work_order" | "feedback" | "artifact";
          source_id: string;
          target_type: "idea" | "feature" | "blueprint" | "work_order" | "feedback" | "artifact";
          target_id: string;
          connection_type: "references" | "depends_on" | "relates_to" | "implements" | "derived_from" | "conflicts_with" | "complements";
          created_by?: string | null;
          is_auto_detected?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          source_type?: "idea" | "feature" | "blueprint" | "work_order" | "feedback" | "artifact";
          source_id?: string;
          target_type?: "idea" | "feature" | "blueprint" | "work_order" | "feedback" | "artifact";
          target_id?: string;
          connection_type?: "references" | "depends_on" | "relates_to" | "implements" | "derived_from" | "conflicts_with" | "complements";
          created_by?: string | null;
          is_auto_detected?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entity_connections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entity_connections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          project_id: string;
          entity_type: "idea" | "feature_node" | "requirement_doc" | "blueprint" | "work_order" | "feedback";
          entity_id: string;
          parent_comment_id: string | null;
          content: string;
          author_id: string;
          anchor_data: Json | null;
          is_resolved: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          entity_type: "idea" | "feature_node" | "requirement_doc" | "blueprint" | "work_order" | "feedback";
          entity_id: string;
          parent_comment_id?: string | null;
          content: string;
          author_id: string;
          anchor_data?: Json | null;
          is_resolved?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          entity_type?: "idea" | "feature_node" | "requirement_doc" | "blueprint" | "work_order" | "feedback";
          entity_id?: string;
          parent_comment_id?: string | null;
          content?: string;
          author_id?: string;
          anchor_data?: Json | null;
          is_resolved?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      blueprints: {
        Row: {
          id: string;
          project_id: string;
          feature_node_id: string | null;
          template_id: string | null;
          blueprint_type: "foundation" | "system_diagram" | "feature";
          title: string;
          content: Json;
          status: "draft" | "in_review" | "approved" | "implemented";
          created_by: string;
          created_at: string;
          updated_at: string;
          search_tsvector: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          feature_node_id?: string | null;
          template_id?: string | null;
          blueprint_type: "foundation" | "system_diagram" | "feature";
          title: string;
          content: Json;
          status?: "draft" | "in_review" | "approved" | "implemented";
          created_by: string;
          created_at?: string;
          updated_at?: string;
          search_tsvector?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          feature_node_id?: string | null;
          template_id?: string | null;
          blueprint_type?: "foundation" | "system_diagram" | "feature";
          title?: string;
          content?: Json;
          status?: "draft" | "in_review" | "approved" | "implemented";
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          search_tsvector?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blueprints_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blueprints_feature_node_id_fkey";
            columns: ["feature_node_id"];
            isOneToOne: false;
            referencedRelation: "feature_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blueprints_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blueprints_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "blueprint_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      blueprint_versions: {
        Row: {
          id: string;
          blueprint_id: string;
          version_number: number;
          content: Json;
          created_by: string;
          created_at: string;
          change_note: string | null;
          trigger_type: string | null;
        };
        Insert: {
          id?: string;
          blueprint_id: string;
          version_number: number;
          content: Json;
          created_by: string;
          created_at?: string;
          change_note?: string | null;
          trigger_type?: string | null;
        };
        Update: {
          id?: string;
          blueprint_id?: string;
          version_number?: number;
          content?: Json;
          created_by?: string;
          created_at?: string;
          change_note?: string | null;
          trigger_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blueprint_versions_blueprint_id_fkey";
            columns: ["blueprint_id"];
            isOneToOne: false;
            referencedRelation: "blueprints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blueprint_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      blueprint_templates: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          blueprint_type: "foundation" | "system_diagram" | "feature";
          outline_content: Json;
          is_default: boolean;
          description: string | null;
          category: "architecture" | "api" | "database" | "feature" | "devops" | "security" | "general" | null;
          is_archived: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          blueprint_type: "foundation" | "system_diagram" | "feature";
          outline_content: Json;
          is_default?: boolean;
          description?: string | null;
          category?: "architecture" | "api" | "database" | "feature" | "devops" | "security" | "general" | null;
          is_archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          blueprint_type?: "foundation" | "system_diagram" | "feature";
          outline_content?: Json;
          is_default?: boolean;
          description?: string | null;
          category?: "architecture" | "api" | "database" | "feature" | "devops" | "security" | "general" | null;
          is_archived?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blueprint_templates_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blueprint_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      blueprint_activities: {
        Row: {
          id: string;
          blueprint_id: string;
          user_id: string;
          action: "created" | "status_changed" | "content_updated" | "reviewed" | "commented";
          action_details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          blueprint_id: string;
          user_id: string;
          action: "created" | "status_changed" | "content_updated" | "reviewed" | "commented";
          action_details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          blueprint_id?: string;
          user_id?: string;
          action?: "created" | "status_changed" | "content_updated" | "reviewed" | "commented";
          action_details?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blueprint_activities_blueprint_id_fkey";
            columns: ["blueprint_id"];
            isOneToOne: false;
            referencedRelation: "blueprints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blueprint_activities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_submissions: {
        Row: {
          id: string;
          project_id: string;
          app_key_id: string | null;
          content: string;
          submitter_email: string | null;
          submitter_name: string | null;
          metadata: Json;
          category: "bug" | "feature_request" | "ux_issue" | "performance" | "other" | "uncategorized";
          tags: string[] | null;
          score: number | null;
          status: "new" | "triaged" | "converted" | "archived";
          converted_to_work_order_id: string | null;
          converted_to_feature_id: string | null;
          ai_suggested: boolean;
          categorization_reasoning: string | null;
          enrichment: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          app_key_id?: string | null;
          content: string;
          submitter_email?: string | null;
          submitter_name?: string | null;
          metadata?: Json;
          category?: "bug" | "feature_request" | "ux_issue" | "performance" | "other" | "uncategorized";
          tags?: string[] | null;
          score?: number | null;
          status?: "new" | "triaged" | "converted" | "archived";
          converted_to_work_order_id?: string | null;
          converted_to_feature_id?: string | null;
          ai_suggested?: boolean;
          categorization_reasoning?: string | null;
          enrichment?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          app_key_id?: string | null;
          content?: string;
          submitter_email?: string | null;
          submitter_name?: string | null;
          metadata?: Json;
          category?: "bug" | "feature_request" | "ux_issue" | "performance" | "other" | "uncategorized";
          tags?: string[] | null;
          score?: number | null;
          status?: "new" | "triaged" | "converted" | "archived";
          converted_to_work_order_id?: string | null;
          converted_to_feature_id?: string | null;
          ai_suggested?: boolean;
          categorization_reasoning?: string | null;
          enrichment?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_submissions_app_key_id_fkey";
            columns: ["app_key_id"];
            isOneToOne: false;
            referencedRelation: "app_keys";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_submissions_converted_to_work_order_id_fkey";
            columns: ["converted_to_work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_submissions_converted_to_feature_id_fkey";
            columns: ["converted_to_feature_id"];
            isOneToOne: false;
            referencedRelation: "feature_nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      mention_references: {
        Row: {
          id: string;
          project_id: string;
          comment_id: string | null;
          mentioned_type: "user" | "requirement_doc" | "blueprint" | "work_order" | "artifact";
          mentioned_id: string;
          mentioned_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          comment_id?: string | null;
          mentioned_type: "user" | "requirement_doc" | "blueprint" | "work_order" | "artifact";
          mentioned_id: string;
          mentioned_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          comment_id?: string | null;
          mentioned_type?: "user" | "requirement_doc" | "blueprint" | "work_order" | "artifact";
          mentioned_id?: string;
          mentioned_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mention_references_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mention_references_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
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
          trigger_type: "edit" | "ai_generated" | "restore" | "import" | null;
          change_note: string | null;
        };
        Insert: {
          id?: string;
          requirement_doc_id: string;
          version_number: number;
          content: string;
          created_by: string;
          created_at?: string;
          change_summary?: string | null;
          trigger_type?: "edit" | "ai_generated" | "restore" | "import" | null;
          change_note?: string | null;
        };
        Update: {
          id?: string;
          requirement_doc_id?: string;
          version_number?: number;
          content?: string;
          created_by?: string;
          created_at?: string;
          change_summary?: string | null;
          trigger_type?: "edit" | "ai_generated" | "restore" | "import" | null;
          change_note?: string | null;
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
      drift_alerts: {
        Row: {
          id: string;
          project_id: string;
          blueprint_id: string;
          requirement_doc_id: string | null;
          feature_node_id: string | null;
          alert_type: "requirement_changed" | "code_changed";
          severity: "low" | "medium" | "high";
          description: string;
          change_summary: string | null;
          status: "new" | "acknowledged" | "resolved";
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          blueprint_id: string;
          requirement_doc_id?: string | null;
          feature_node_id?: string | null;
          alert_type: "requirement_changed" | "code_changed";
          severity?: "low" | "medium" | "high";
          description: string;
          change_summary?: string | null;
          status?: "new" | "acknowledged" | "resolved";
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          blueprint_id?: string;
          requirement_doc_id?: string | null;
          feature_node_id?: string | null;
          alert_type?: "requirement_changed" | "code_changed";
          severity?: "low" | "medium" | "high";
          description?: string;
          change_summary?: string | null;
          status?: "new" | "acknowledged" | "resolved";
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drift_alerts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drift_alerts_blueprint_id_fkey";
            columns: ["blueprint_id"];
            isOneToOne: false;
            referencedRelation: "blueprints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drift_alerts_requirement_doc_id_fkey";
            columns: ["requirement_doc_id"];
            isOneToOne: false;
            referencedRelation: "requirements_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      cross_doc_suggestions: {
        Row: {
          id: string;
          project_id: string;
          created_by: string | null;
          trigger_blueprint_id: string | null;
          title: string;
          description: string;
          change_impact: string | null;
          status: "proposed" | "approved" | "rejected" | "applied";
          created_at: string;
          updated_at: string;
          applied_at: string | null;
          applied_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          created_by?: string | null;
          trigger_blueprint_id?: string | null;
          title: string;
          description: string;
          change_impact?: string | null;
          status?: "proposed" | "approved" | "rejected" | "applied";
          created_at?: string;
          updated_at?: string;
          applied_at?: string | null;
          applied_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          created_by?: string | null;
          trigger_blueprint_id?: string | null;
          title?: string;
          description?: string;
          change_impact?: string | null;
          status?: "proposed" | "approved" | "rejected" | "applied";
          created_at?: string;
          updated_at?: string;
          applied_at?: string | null;
          applied_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cross_doc_suggestions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cross_doc_suggestions_trigger_blueprint_id_fkey";
            columns: ["trigger_blueprint_id"];
            isOneToOne: false;
            referencedRelation: "blueprints";
            referencedColumns: ["id"];
          },
        ];
      };
      cross_doc_suggestion_items: {
        Row: {
          id: string;
          suggestion_id: string;
          blueprint_id: string;
          suggestion_type: "edit" | "add_section" | "remove_section";
          target_section: string | null;
          current_content: string | null;
          proposed_content: string | null;
          reasoning: string | null;
          is_approved: boolean;
          applied: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          suggestion_id: string;
          blueprint_id: string;
          suggestion_type: "edit" | "add_section" | "remove_section";
          target_section?: string | null;
          current_content?: string | null;
          proposed_content?: string | null;
          reasoning?: string | null;
          is_approved?: boolean;
          applied?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          suggestion_id?: string;
          blueprint_id?: string;
          suggestion_type?: "edit" | "add_section" | "remove_section";
          target_section?: string | null;
          current_content?: string | null;
          proposed_content?: string | null;
          reasoning?: string | null;
          is_approved?: boolean;
          applied?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cross_doc_suggestion_items_suggestion_id_fkey";
            columns: ["suggestion_id"];
            isOneToOne: false;
            referencedRelation: "cross_doc_suggestions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cross_doc_suggestion_items_blueprint_id_fkey";
            columns: ["blueprint_id"];
            isOneToOne: false;
            referencedRelation: "blueprints";
            referencedColumns: ["id"];
          },
        ];
      };
      wo_sync_alerts: {
        Row: {
          id: string;
          project_id: string;
          work_order_id: string;
          blueprint_id: string;
          change_type: "content_changed" | "requirements_changed" | "acceptance_criteria_changed";
          change_summary: string;
          status: "new" | "acknowledged" | "resolved";
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          work_order_id: string;
          blueprint_id: string;
          change_type: "content_changed" | "requirements_changed" | "acceptance_criteria_changed";
          change_summary: string;
          status?: "new" | "acknowledged" | "resolved";
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          work_order_id?: string;
          blueprint_id?: string;
          change_type?: "content_changed" | "requirements_changed" | "acceptance_criteria_changed";
          change_summary?: string;
          status?: "new" | "acknowledged" | "resolved";
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wo_sync_alerts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wo_sync_alerts_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wo_sync_alerts_blueprint_id_fkey";
            columns: ["blueprint_id"];
            isOneToOne: false;
            referencedRelation: "blueprints";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          type: "mention" | "comment" | "assignment" | "status_change" | "feedback";
          title: string;
          body: string | null;
          link_url: string | null;
          source_entity_type: string | null;
          source_entity_id: string | null;
          triggered_by_user_id: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          type: "mention" | "comment" | "assignment" | "status_change" | "feedback";
          title: string;
          body?: string | null;
          link_url?: string | null;
          source_entity_type?: string | null;
          source_entity_id?: string | null;
          triggered_by_user_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          type?: "mention" | "comment" | "assignment" | "status_change" | "feedback";
          title?: string;
          body?: string | null;
          link_url?: string | null;
          source_entity_type?: string | null;
          source_entity_id?: string | null;
          triggered_by_user_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      user_notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_on_mention: boolean;
          email_on_comment: boolean;
          email_on_assignment: boolean;
          email_on_feedback: boolean;
          email_digest: boolean;
          email_digest_frequency: "daily" | "weekly";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_on_mention?: boolean;
          email_on_comment?: boolean;
          email_on_assignment?: boolean;
          email_on_feedback?: boolean;
          email_digest?: boolean;
          email_digest_frequency?: "daily" | "weekly";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_on_mention?: boolean;
          email_on_comment?: boolean;
          email_on_assignment?: boolean;
          email_on_feedback?: boolean;
          email_digest?: boolean;
          email_digest_frequency?: "daily" | "weekly";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_log: {
        Row: {
          id: string;
          user_id: string | null;
          email_address: string;
          event_type: string;
          subject: string | null;
          template_name: string | null;
          sent_at: string;
          delivery_status: "pending" | "sent" | "failed";
          error_message: string | null;
          resend_message_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email_address: string;
          event_type: string;
          subject?: string | null;
          template_name?: string | null;
          sent_at?: string;
          delivery_status?: "pending" | "sent" | "failed";
          error_message?: string | null;
          resend_message_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email_address?: string;
          event_type?: string;
          subject?: string | null;
          template_name?: string | null;
          sent_at?: string;
          delivery_status?: "pending" | "sent" | "failed";
          error_message?: string | null;
          resend_message_id?: string | null;
        };
        Relationships: [];
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
      work_order_project_member: {
        Args: {
          check_work_order_id: string;
        };
        Returns: boolean;
      };
      is_active_app_key: {
        Args: {
          check_app_key_id: string;
        };
        Returns: boolean;
      };
      blueprint_project_member: {
        Args: {
          check_blueprint_id: string;
        };
        Returns: boolean;
      };
      artifact_project_member: {
        Args: {
          check_artifact_id: string;
        };
        Returns: boolean;
      };
      comment_project_member: {
        Args: {
          check_comment_id: string;
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
export type RequirementVersionTriggerType = NonNullable<RequirementVersion["trigger_type"]>;

export type Phase = Database["public"]["Tables"]["phases"]["Row"];
export type WorkOrder = Database["public"]["Tables"]["work_orders"]["Row"];
export type WorkOrderActivity = Database["public"]["Tables"]["work_order_activity"]["Row"];

export type EntityConnection = Database["public"]["Tables"]["entity_connections"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];

export type ArtifactFolder = Database["public"]["Tables"]["artifact_folders"]["Row"];
export type Artifact = Database["public"]["Tables"]["artifacts"]["Row"];
export type ArtifactEntityLink = Database["public"]["Tables"]["artifact_entity_links"]["Row"];
export type ArtifactEntityType = ArtifactEntityLink["entity_type"];

export type Blueprint = Database["public"]["Tables"]["blueprints"]["Row"];
export type BlueprintVersion = Database["public"]["Tables"]["blueprint_versions"]["Row"];
export type BlueprintTemplate = Database["public"]["Tables"]["blueprint_templates"]["Row"];
export type BlueprintTemplateCategory = NonNullable<BlueprintTemplate["category"]>;
export type BlueprintActivity = Database["public"]["Tables"]["blueprint_activities"]["Row"];

export type AppKey = Database["public"]["Tables"]["app_keys"]["Row"];
export type McpConnection = Database["public"]["Tables"]["mcp_connections"]["Row"];
export type FeedbackSubmission = Database["public"]["Tables"]["feedback_submissions"]["Row"];

// Status type aliases
export type IdeaStatus = Idea["status"];
export type FeatureLevel = FeatureNode["level"];
export type FeatureStatus = FeatureNode["status"];
export type DocType = RequirementsDocument["doc_type"];
export type TechReqCategory = NonNullable<RequirementsDocument["category"]>;
export type WorkOrderStatus = WorkOrder["status"];
export type WorkOrderPriority = WorkOrder["priority"];
export type PhaseStatus = Phase["status"];
export type EntityConnectionType = EntityConnection["connection_type"];
export type GraphEntityType = EntityConnection["source_type"];
export type CommentEntityType = Comment["entity_type"];
export type BlueprintType = Blueprint["blueprint_type"];
export type BlueprintStatus = Blueprint["status"];
export type AppKeyStatus = AppKey["status"];
export type AppKeyEnvironment = AppKey["environment"];
export type FeedbackCategory = FeedbackSubmission["category"];
export type FeedbackStatus = FeedbackSubmission["status"];

export type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
export type MentionReference = Database["public"]["Tables"]["mention_references"]["Row"];
export type MentionType = MentionReference["mentioned_type"];
export type DriftAlert = Database["public"]["Tables"]["drift_alerts"]["Row"];
export type DriftAlertType = DriftAlert["alert_type"];
export type DriftSeverity = DriftAlert["severity"];
export type DriftStatus = DriftAlert["status"];

export type CrossDocSuggestion = Database["public"]["Tables"]["cross_doc_suggestions"]["Row"];
export type CrossDocSuggestionItem = Database["public"]["Tables"]["cross_doc_suggestion_items"]["Row"];
export type CrossDocSuggestionStatus = CrossDocSuggestion["status"];
export type CrossDocSuggestionType = CrossDocSuggestionItem["suggestion_type"];
export type ExtractionStrategy = Project["extraction_strategy"];

export type WoSyncAlert = Database["public"]["Tables"]["wo_sync_alerts"]["Row"];
export type WoSyncAlertChangeType = WoSyncAlert["change_type"];
export type WoSyncAlertStatus = WoSyncAlert["status"];

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationType = Notification["type"];

export type UserNotificationPreferences = Database["public"]["Tables"]["user_notification_preferences"]["Row"];
export type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
