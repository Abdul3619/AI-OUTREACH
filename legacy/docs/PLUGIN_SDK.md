# Plugin SDK & Third-Party Integration Guide (v1.0.0)

This SDK guide details the modular, interface-based plugin architecture of the **AI Outreach Platform & Sales CRM** and describes how to write and register custom connector plugins to extend system capabilities.

---

## 🔌 1. Core Integration Strategy

The system enforces a **Plugin-Based Adaptability** standard. Core logic never communicates directly with third-party service drivers (such as email engines or relational databases). Instead, all integrations are mounted via abstract interfaces, shielding core workflows from breaking changes in underlying libraries.

### Core Interface Registries:
1. **`DatabaseConnector`**: Interfacing relational operations. Enables switching between SQLite, PostgreSQL (Cloud SQL), or Supabase without modifying Express route controllers.
2. **`EmailProviderConnector`**: Standardizes delivery hooks. Swaps between localized SMTP mail servers, Resend API, or SendGrid wrappers.
3. **`AIServiceConnector`**: Governs model prompting and schema validations. Swaps between Google Gemini, OpenAI, or Anthropic models.

---

## 🛠️ 2. Writing a Custom Database Plugin

To write and register a custom Database Connector, your class must implement the base interface schema.

### Interface Definition:
```typescript
export interface DatabaseConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // CRM Lead Queries
  getLead(leadId: string): Promise<Lead | null>;
  listLeads(workspaceId: string, filters?: LeadFilters): Promise<Lead[]>;
  saveLead(lead: Lead): Promise<Lead>;
  deleteLead(leadId: string): Promise<boolean>;
  
  // Tasks & Reminders
  getTasks(leadId?: string): Promise<Task[]>;
  saveTask(task: Task): Promise<Task>;
}
```

### Custom Implementation Sample (e.g., Supabase PostgreSQL):
```typescript
import { DatabaseConnector } from './types';
import { createClient, SupabaseClient } from '@supabase/supabase-client';

export class SupabaseDbConnector implements DatabaseConnector {
  private client: SupabaseClient | null = null;

  async connect(): Promise<void> {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || '';
    this.client = createClient(url, key);
    console.log('Supabase Database Connector Mounted Successfully');
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async getLead(leadId: string): Promise<Lead | null> {
    if (!this.client) throw new Error('DB Client uninitialized');
    const { data, error } = await this.client
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (error) return null;
    return data as Lead;
  }

  async listLeads(workspaceId: string, filters?: LeadFilters): Promise<Lead[]> {
    if (!this.client) throw new Error('DB Client uninitialized');
    let query = this.client.from('leads').select('*').eq('workspace_id', workspaceId);
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    const { data } = await query;
    return (data || []) as Lead[];
  }

  async saveLead(lead: Lead): Promise<Lead> {
    if (!this.client) throw new Error('DB Client uninitialized');
    const { data } = await this.client
      .from('leads')
      .upsert(lead)
      .select()
      .single();
    return data as Lead;
  }

  async deleteLead(leadId: string): Promise<boolean> {
    if (!this.client) throw new Error('DB Client uninitialized');
    const { error } = await this.client.from('leads').delete().eq('id', leadId);
    return !error;
  }

  async getTasks(leadId?: string): Promise<Task[]> {
    if (!this.client) throw new Error('DB Client uninitialized');
    let q = this.client.from('tasks').select('*');
    if (leadId) q = q.eq('lead_id', leadId);
    const { data } = await q;
    return (data || []) as Task[];
  }

  async saveTask(task: Task): Promise<Task> {
    if (!this.client) throw new Error('DB Client uninitialized');
    const { data } = await this.client.from('tasks').upsert(task).select().single();
    return data as Task;
  }
}
```

---

## 📬 3. Writing an Email Delivery Plugin

Extend outreach functionality by implementing a custom mail provider hook, wrapping premium mail APIs:

### Interface Definition:
```typescript
export interface EmailProviderConnector {
  sendEmail(recipient: string, subject: string, htmlBody: string): Promise<{ messageId: string }>;
}
```

### Custom Resend API Implementation:
```typescript
import { EmailProviderConnector } from './types';
import axios from 'axios';

export class ResendMailConnector implements EmailProviderConnector {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
  }

  async sendEmail(recipient: string, subject: string, htmlBody: string): Promise<{ messageId: string }> {
    if (!this.apiKey) {
      throw new Error('Resend API key missing. Cannot initiate dispatch.');
    }

    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: 'outreach@your-agency.com',
        to: recipient,
        subject: subject,
        html: htmlBody
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { messageId: response.data.id };
  }
}
```

---

## ⚙️ 4. Registering Plugins at Boot

The system aggregates all active integrations inside a central Service Registry (`server/services/registry.ts`). You can dynamically register plugins during initialization:

```typescript
import { ServiceRegistry } from './services/registry';
import { SupabaseDbConnector } from './plugins/supabase';
import { ResendMailConnector } from './plugins/resend';

const registry = ServiceRegistry.getInstance();

// Register the custom DB and Email connectors
registry.registerDatabase(new SupabaseDbConnector());
registry.registerEmailProvider(new ResendMailConnector());
```

This dynamic approach ensures you can swap active drivers simply by adjusting environment variables without touching the business layers.
