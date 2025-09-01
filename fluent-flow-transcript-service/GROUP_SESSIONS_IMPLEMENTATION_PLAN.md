# Group Sessions Implementation Plan
*Deep Integration Approach - Hybrid Flow*

## 🎯 **Core Concept**
Extend existing individual quiz system to support group sessions with deep integration between extension and web app.

## 📋 **Implementation Phases**

### **Phase 1: Instant Sessions (Extension → Group)**
**Flow A: Extension-initiated Group Sessions**
1. User creates questions in extension sidepanel
2. **NEW**: "Share to Group" button appears alongside existing "Share" button
3. Extension calls API to fetch user's groups
4. User selects target group from dropdown
5. Extension creates group session + shares token
6. Group members get notification/invitation
7. Session uses existing `questions/[token]` page with group context

### **Phase 2: Scheduled Sessions (Group Page)**
**Flow B: Web-initiated Planned Sessions**
1. User goes to Groups → [Group] → Sessions tab
2. Click "Schedule Session" button
3. Modal with options:
   - Import from extension recent loops
   - Manual create with video URL/title
   - Schedule date/time
   - Add description/notes
4. Send calendar invites to group members
5. Auto-start at scheduled time

## 🔧 **Technical Architecture**

### **New API Endpoints**
```
# Group Sessions Management
POST   /api/groups/[groupId]/sessions/create-instant
POST   /api/groups/[groupId]/sessions/schedule  
GET    /api/groups/[groupId]/sessions
GET    /api/groups/[groupId]/sessions/[sessionId]
PUT    /api/groups/[groupId]/sessions/[sessionId]
DELETE /api/groups/[groupId]/sessions/[sessionId]

# Extension Integration
GET    /api/user/groups                    # For extension dropdown
POST   /api/extension/create-group-session # Extension → Group session
GET    /api/extension/recent-loops         # For web import
```

### **Database Updates**
```sql
-- Add to existing group_quiz_sessions table
ALTER TABLE group_quiz_sessions ADD COLUMN session_type VARCHAR(20) DEFAULT 'scheduled';
ALTER TABLE group_quiz_sessions ADD COLUMN extension_loop_id VARCHAR(255);
ALTER TABLE group_quiz_sessions ADD COLUMN questions_data JSONB;

-- Session types: 'instant', 'scheduled', 'recurring'
```

### **Page Structure**
```
/questions/[token]?groupId=[groupId]&sessionId=[sessionId]
- Existing quiz functionality
- + Group context UI
- + Real-time member participation
- + Group results comparison
```

## ⚙️ **Permission System (Flexible)**

### **Group Settings**
```typescript
interface GroupSettings {
  session_creation_permission: 'owner' | 'admin' | 'all_members'
  session_approval_required: boolean
  advance_notice_hours: number
  allowed_time_slots?: { start: string, end: string }[]
}
```

### **Default Permissions**
- **Create Instant Sessions**: All Members
- **Create Scheduled Sessions**: Owner + Admins
- **Approval Required**: False (can be enabled per group)

## 🔗 **Deep Integration Features**

### **Extension Enhancements**
1. **Group Selector**: Dropdown of user's groups in sidepanel
2. **Active Sessions**: Show ongoing group sessions user can join
3. **Session History**: Access to participated group sessions
4. **Quick Join**: One-click join from extension notifications

### **Web App Enhancements**  
1. **Extension Sync**: Import recent loops from extension
2. **Live Notifications**: Real-time session invites/updates
3. **Session Dashboard**: Live participant tracking
4. **Results Analytics**: Compare group vs individual performance

## 📊 **Sessions Tab Implementation**

### **Features**
- **Session List**: All sessions (past/future) with status indicators
- **Quick Actions**: Join active, view results, reschedule
- **Filters**: By status, date range, creator
- **Statistics**: Group performance trends

### **Session States**
- `scheduled` → `active` → `completed`
- `cancelled` (can be set anytime before completion)

## 🎛️ **Settings Tab Implementation**

### **Permission Management**
- Session creation permissions
- Member roles management  
- Notification preferences

### **Group Configuration**
- Basic info (name, description, privacy)
- Advanced settings (time restrictions, approval workflows)
- Group analytics dashboard

## 🚀 **Development Priority**

### **Week 1-2: Foundation**
1. Research existing API/flow patterns
2. Create new API endpoints for sessions
3. Database schema updates
4. Basic UI for Sessions tab

### **Week 3-4: Extension Integration**
1. Extension "Share to Group" functionality
2. Group dropdown API integration
3. Session creation flow

### **Week 5-6: Web Features**
1. Scheduled sessions creation
2. Session management UI
3. Settings tab implementation

### **Week 7-8: Polish & Testing**
1. Real-time features
2. Notifications system
3. Analytics dashboard
4. End-to-end testing

## 📝 **Questions to Research**

### **Current System Analysis Needed**
1. How does extension currently create/share questions?
2. What's the data structure of existing question tokens?
3. How does `questions/[token]` page work internally?
4. What APIs does extension currently use?
5. How is user authentication handled between extension/web?

### **Technical Decisions**
1. Real-time updates: WebSockets vs Server-Sent Events vs Polling?
2. Notification system: Push notifications vs Email vs In-app only?
3. Question storage: Duplicate in group_sessions vs Reference existing?
4. Member synchronization: How to handle offline members?

---

**Next Steps**: 
1. ✅ Analyze existing codebase patterns
2. ⏳ Research extension integration points  
3. ⏳ Design detailed API specifications
4. ⏳ Create implementation timeline with milestones