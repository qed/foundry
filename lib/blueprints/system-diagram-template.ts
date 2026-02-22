/**
 * System diagram Mermaid templates for each diagram type.
 * Content is stored as a JSON object: { type: 'mermaid', diagram_type, code }
 */

export type DiagramType = 'flowchart' | 'sequence' | 'er' | 'class'

export interface MermaidContent {
  type: 'mermaid'
  diagram_type: DiagramType
  code: string
}

const FLOWCHART_TEMPLATE = `graph TD
    A[Client Browser] -->|HTTP Request| B[Load Balancer]
    B --> C[Web Server]
    C --> D[Application Layer]
    D --> E[(Database)]
    D --> F[Cache Layer]
    D --> G[External APIs]

    style A fill:#1a1d27,stroke:#00d4ff,color:#e4e7ec
    style B fill:#1a1d27,stroke:#8b5cf6,color:#e4e7ec
    style C fill:#1a1d27,stroke:#00d4ff,color:#e4e7ec
    style D fill:#1a1d27,stroke:#00d4ff,color:#e4e7ec
    style E fill:#1a1d27,stroke:#8b5cf6,color:#e4e7ec
    style F fill:#1a1d27,stroke:#5a5f73,color:#e4e7ec
    style G fill:#1a1d27,stroke:#5a5f73,color:#e4e7ec`

const SEQUENCE_TEMPLATE = `sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as API Server
    participant DB as Database

    U->>FE: User Action
    FE->>API: API Request
    API->>DB: Query Data
    DB-->>API: Result Set
    API-->>FE: JSON Response
    FE-->>U: Update UI`

const ER_TEMPLATE = `erDiagram
    USERS {
        uuid id PK
        string email
        string name
        timestamp created_at
    }
    PROJECTS {
        uuid id PK
        string name
        uuid org_id FK
        timestamp created_at
    }
    PROJECT_MEMBERS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        string role
    }

    USERS ||--o{ PROJECT_MEMBERS : "has"
    PROJECTS ||--o{ PROJECT_MEMBERS : "has"`

const CLASS_TEMPLATE = `classDiagram
    class BaseService {
        +string name
        +initialize()
        +destroy()
    }
    class AuthService {
        -UserRepository userRepo
        +login(email, password)
        +logout()
        +getSession()
    }
    class DataService {
        -DatabaseClient db
        +query(table, filters)
        +insert(table, data)
        +update(table, id, data)
    }

    BaseService <|-- AuthService
    BaseService <|-- DataService`

export const DIAGRAM_TEMPLATES: Record<DiagramType, string> = {
  flowchart: FLOWCHART_TEMPLATE,
  sequence: SEQUENCE_TEMPLATE,
  er: ER_TEMPLATE,
  class: CLASS_TEMPLATE,
}

export const DIAGRAM_TYPE_OPTIONS: { value: DiagramType; label: string; description: string }[] = [
  { value: 'flowchart', label: 'Flowchart', description: 'System architecture and data flow' },
  { value: 'sequence', label: 'Sequence', description: 'Interaction between components' },
  { value: 'er', label: 'ER Diagram', description: 'Database schema and relationships' },
  { value: 'class', label: 'Class Diagram', description: 'Object-oriented structure' },
]

export function buildSystemDiagramContent(diagramType: DiagramType): MermaidContent {
  return {
    type: 'mermaid',
    diagram_type: diagramType,
    code: DIAGRAM_TEMPLATES[diagramType],
  }
}
